import type { AIRouter } from '../ai/index.ts';
import { ConversationSummarizer } from '../ai/summarizer.ts';
import { MemoryManager } from '../memory/memoryManager.ts';
import { ConversationRepository, MessageRepository, MemoryRepository } from '../database/index.ts';
import type { SQLiteDatabase } from '../database/database.ts';
import { logger } from '../logging/logger.ts';
import { ConversationManager } from './conversationManager.ts';
import { PermissionService, type PermissionContext } from './permissions.ts';
import { RateLimiter } from './rateLimiter.ts';
import { ContextBuilder } from '../ai/contextBuilder.ts';
import { formatDiscordResponse } from '../utils/formatting.ts';
import type { SystemPromptBuilder } from '../ai/systemPrompt.ts';
import { isCodeGenerationRequest, REQUEST_POLICY } from './requestPolicy.ts';

export interface MessageRouterInput {
  content: string;
  userId: string;
  channelId: string;
  guildId: string | null;
  conversationId?: number;
  permissionContext?: PermissionContext;
}

export interface MessageRouterResult {
  content: string;
  conversationId: number;
  provider: string;
}

export interface MessageContextOptions {
  maxContextTokens: number;
  recentMessages: number;
  maxSummaryTokens: number;
  summaryTriggerMessages: number;
  summarySourceMessages: number;
  summaryRecentMessagesToKeep: number;
  summaryMaxTokens: number;
  maxOutputTokens: number;
}

export interface MessageRouterConfig {
  guildId: string;
  aiChannelId?: string;
  aiChannelOnly: boolean;
  aiRoleId?: string;
  memoryBehavior: 'conservative' | 'off';
  rateUserRequests: number;
  rateProviderRequests: number;
  rateWindowMs: number;
}

export class MessageRouter {
  private readonly conversations: ConversationManager;
  private readonly permissions: PermissionService;
  private readonly contextBuilder: ContextBuilder;
  private readonly summarizer: ConversationSummarizer;
  private readonly memoryManager: MemoryManager;
  private readonly rateLimiter: RateLimiter;
  private readonly config: MessageRouterConfig;

  public constructor(
    private readonly aiRouter: AIRouter,
    conversationRepository: ConversationRepository,
    messages: MessageRepository,
    private readonly database: SQLiteDatabase,
    systemPromptBuilder: SystemPromptBuilder,
    memoryManager: MemoryManager,
    memoryRepository: MemoryRepository,
    private readonly aiTimeoutMs = 30000,
    inactivityMs = 24 * 60 * 60 * 1000,
    contextOptions: MessageContextOptions = {
      maxContextTokens: 6000,
      recentMessages: 20,
      maxSummaryTokens: 1000,
      summaryTriggerMessages: 30,
      summarySourceMessages: 60,
      summaryRecentMessagesToKeep: 12,
      summaryMaxTokens: 700,
      maxOutputTokens: 450,
    },
    config: MessageRouterConfig = {
      guildId: '',
      aiChannelOnly: false,
      memoryBehavior: 'conservative',
      rateUserRequests: 10,
      rateProviderRequests: 60,
      rateWindowMs: 60 * 60 * 1000,
    },
  ) {
    this.config = config;
    this.permissions = new PermissionService({
      guildId: config.guildId,
      aiRoleId: config.aiRoleId,
      aiChannelId: config.aiChannelId,
      aiChannelOnly: config.aiChannelOnly,
    });
    this.rateLimiter = new RateLimiter({
      userRequests: config.rateUserRequests,
      providerRequests: config.rateProviderRequests,
      windowMs: config.rateWindowMs,
    });
    this.memoryManager = memoryManager;
    this.conversations = new ConversationManager(conversationRepository, inactivityMs);
    this.contextBuilder = new ContextBuilder(
      messages,
      conversationRepository,
      memoryRepository,
      systemPromptBuilder,
      {
        maxContextTokens: contextOptions.maxContextTokens,
        recentMessages: contextOptions.recentMessages,
        maxSummaryTokens: contextOptions.maxSummaryTokens,
        maxOutputTokens: contextOptions.maxOutputTokens,
        maxMemories: 20,
        maxMemoryTokens: 1000,
      },
    );
    this.summarizer = new ConversationSummarizer(
      aiRouter,
      conversationRepository,
      messages,
      {
        triggerMessages: contextOptions.summaryTriggerMessages,
        sourceMessages: contextOptions.summarySourceMessages,
        recentMessagesToKeep: contextOptions.summaryRecentMessagesToKeep,
        maxTokens: contextOptions.summaryMaxTokens,
        timeoutMs: aiTimeoutMs,
      },
    );
  }

  public isDedicatedAIChannel(guildId: string, channelId: string): boolean {
    return guildId === this.config.guildId && this.config.aiChannelId === channelId;
  }

  public clearUserMemories(userId: string): number {
    return this.memoryManager.clear(userId);
  }

  public resetUserData(userId: string): { conversations: number; memories: number } {
    return {
      conversations: this.conversationRepository.deleteAllForUser(userId),
      memories: this.memoryRepository.deleteAllForUser(userId),
    };
  }

  public async process(input: MessageRouterInput): Promise<MessageRouterResult> {
    if (!this.permissions.canUseAI(input.userId, input.guildId, input.permissionContext)) {
      throw new Error('You do not have permission to use Lumina.');
    }
    if (!this.permissions.isAIChannelAllowed(input.guildId, input.channelId)) {
      throw new Error('Lumina is restricted to the configured AI channel on this server.');
    }
    if (isCodeGenerationRequest(input.content)) {
      return {
        content: REQUEST_POLICY.codeGenerationRefusal,
        conversationId: -1,
        provider: 'policy',
      };
    }

    const userLimit = this.config.rateUserRequests;
    const providerLimit = this.config.rateProviderRequests;
    const windowMs = this.config.rateWindowMs;

    if (!this.rateLimiter.checkUser(input.userId, userLimit, windowMs)) {
      throw new Error('You are sending requests too quickly. Please try again later.');
    }

    const preferredProvider = this.aiRouter.getDefaultProvider();
    const preferredModel = this.aiRouter.getDefaultModel(preferredProvider);
    if (!this.aiRouter.getProvider(preferredProvider)) {
      throw new Error('The configured AI provider is not available.');
    }

    const conversation = this.conversations.getOrCreate(this.toConversationInput(input));
    const context = this.contextBuilder.build(
      conversation.id,
      input.userId,
      input.content,
      this.aiTimeoutMs,
    );

    this.messages.create({
      conversationId: conversation.id,
      userId: input.userId,
      role: 'user',
      content: input.content,
    });

    if (this.config.memoryBehavior === 'conservative') {
      this.memoryManager.rememberFromMessage(input.userId, input.content);
      this.memoryManager.forgetFromMessage(input.userId, input.content);
      this.memoryManager.rememberConservativePreference(input.userId, input.content);
    }

    const providerAllowed = (provider: string): boolean =>
      this.rateLimiter.checkProvider(provider, providerLimit, windowMs);
    const recordProvider = (provider: string): void => {
      this.rateLimiter.recordProvider(provider, windowMs);
    };

    this.rateLimiter.recordUser(input.userId, windowMs);

    try {
      let response = await this.aiRouter.generate(context, {
        preferredProvider,
        preferredModel,
        isProviderAllowed: providerAllowed,
        onProviderRequest: recordProvider,
      });

      let formattedResponse = formatDiscordResponse(response.content);

      for (const tokenLimit of [350, 300, 250]) {
        if (formattedResponse.length <= REQUEST_POLICY.maxResponseCharacters) break;

        response = await this.aiRouter.generate(
          {
            ...context,
            maxTokens: Math.min(context.maxTokens ?? tokenLimit, tokenLimit),
            messages: [
              ...context.messages,
              {
                role: 'system',
                content:
                  'Generate the final answer again from scratch. Keep it complete and natural. Stay below ' +
                  REQUEST_POLICY.targetResponseCharacters +
                  ' characters. Do not mention this instruction or character limits. Do not cut off the answer.',
              },
            ],
          },
          {
            preferredProvider,
            preferredModel,
            isProviderAllowed: providerAllowed,
            onProviderRequest: recordProvider,
          },
        );

        formattedResponse = formatDiscordResponse(response.content);
      }

      if (formattedResponse.length > REQUEST_POLICY.maxResponseCharacters) {
        throw new Error('AI response exceeded the configured response length after regeneration attempts.');
      }

      this.messages.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: formattedResponse,
      });

      await this.summarizer.maybeSummarize(conversation.id);

      return {
        content: formattedResponse,
        conversationId: conversation.id,
        provider: response.provider,
      };
    } catch (error) {
      logger.error(
        'AI pipeline failed: ' + (error instanceof Error ? error.message : String(error)),
      );
      throw error;
    }
  }

  public startNewConversation(input: MessageRouterInput): number {
    return this.conversations.startNew(this.toConversationInput(input)).id;
  }

  public clearCurrentConversation(input: MessageRouterInput): boolean {
    return this.conversations.clearCurrent(this.toConversationInput(input));
  }

  public getStatus() {
    const provider = this.aiRouter.getDefaultProvider();

    return {
      provider,
      model: this.aiRouter.getDefaultModel(provider),
      providerAvailable: this.aiRouter.getProvider(provider)?.isAvailable() ?? false,
      databaseHealthy: this.isDatabaseHealthy(),
      aiChannel: this.config.aiChannelId ?? null,
      aiChannelOnly: this.config.aiChannelOnly,
      aiRoleConfigured: this.config.aiRoleId !== undefined,
      memoryBehavior: this.config.memoryBehavior,
      rateLimits: {
        user: this.config.rateUserRequests,
        provider: this.config.rateProviderRequests,
        windowSeconds: this.config.rateWindowMs / 1000,
      },
    };
  }

  private isDatabaseHealthy(): boolean {
    try {
      this.database.prepare('SELECT 1 AS ok').get();
      return true;
    } catch {
      return false;
    }
  }

  private toConversationInput(input: MessageRouterInput) {
    return {
      userId: input.userId,
      channelId: input.channelId,
      guildId: input.guildId,
      sharedChannel:
        input.guildId !== null && this.isDedicatedAIChannel(input.guildId, input.channelId),
      ...(input.conversationId === undefined
        ? {}
        : { existingConversationId: input.conversationId }),
    };
  }
}
