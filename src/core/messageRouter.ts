import type { AIRouter } from '../ai/index.ts';
import { ConversationSummarizer } from '../ai/summarizer.ts';
import { MemoryManager } from '../memory/memoryManager.ts';
import { ConversationRepository, MessageRepository, SettingsRepository } from '../database/index.ts';
import { logger } from '../logging/logger.ts';
import { ConversationManager } from './conversationManager.ts';
import { PermissionService } from './permissions.ts';
import { ContextBuilder } from '../ai/contextBuilder.ts';
import type { SystemPromptBuilder } from '../ai/systemPrompt.ts';
import { SERVER_PERSONALITY_SETTING_KEY } from '../ai/systemPrompt.ts';

export interface MessageRouterInput {
  content: string;
  userId: string;
  channelId: string;
  guildId: string | null;
  conversationId?: number;
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
}

export class MessageRouter {
  private readonly conversations: ConversationManager;
  private readonly permissions = new PermissionService();
  private readonly contextBuilder: ContextBuilder;
  private readonly summarizer: ConversationSummarizer;
  private readonly memoryManager: MemoryManager;

  public constructor(
    private readonly aiRouter: AIRouter,
    conversationRepository: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly settings: SettingsRepository,
    systemPromptBuilder: SystemPromptBuilder,
    memoryManager: MemoryManager,
    private readonly memoryRepository: import('../database/index.ts').MemoryRepository,
    private readonly aiTimeoutMs = 30_000,
    inactivityMs = 24 * 60 * 60 * 1000,
    contextOptions: MessageContextOptions = {
      maxContextTokens: 6000,
      recentMessages: 20,
      maxSummaryTokens: 1000,
      summaryTriggerMessages: 30,
      summarySourceMessages: 60,
      summaryRecentMessagesToKeep: 12,
      summaryMaxTokens: 700,
    },
  ) {
    this.memoryManager = memoryManager;
    this.conversations = new ConversationManager(
      conversationRepository,
      inactivityMs,
    );
    this.contextBuilder = new ContextBuilder(messages, conversationRepository, this.memoryRepository, settings, systemPromptBuilder, {
      maxContextTokens: contextOptions.maxContextTokens,
      recentMessages: contextOptions.recentMessages,
      maxSummaryTokens: contextOptions.maxSummaryTokens,
      maxMemories: 20,
      maxMemoryTokens: 1000,
    });
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

  public getServerPersonality(guildId: string): string | null {
    return this.settings.get('guild', guildId, SERVER_PERSONALITY_SETTING_KEY)?.value ?? null;
  }

  public setServerPersonality(guildId: string, personality: string): void {
    const normalized = personality.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      throw new Error('Server personality cannot be empty.');
    }
    if (normalized.length > 1500) {
      throw new Error('Server personality must be 1500 characters or fewer.');
    }
    this.settings.set('guild', guildId, SERVER_PERSONALITY_SETTING_KEY, normalized);
  }

  public clearServerPersonality(guildId: string): boolean {
    return this.settings.delete('guild', guildId, SERVER_PERSONALITY_SETTING_KEY);
  }

  public isDedicatedAIChannel(guildId: string, channelId: string): boolean {
    return this.getDedicatedAIChannel(guildId) === channelId;
  }

  public getDedicatedAIChannel(guildId: string): string | null {
    return this.settings.get('guild', guildId, 'ai_channel_id')?.value ?? null;
  }

  public setDedicatedAIChannel(guildId: string, channelId: string): void {
    this.settings.set('guild', guildId, 'ai_channel_id', channelId);
  }

  public clearDedicatedAIChannel(guildId: string): boolean {
    return this.settings.delete('guild', guildId, 'ai_channel_id');
  }

  public async process(input: MessageRouterInput): Promise<MessageRouterResult> {
    if (!this.permissions.canUseAI(input.userId, input.guildId)) {
      throw new Error('You do not have permission to use Lumina.');
    }

    const conversation = this.conversations.getOrCreate(
      this.toConversationInput(input),
    );
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

    this.memoryManager.rememberFromMessage(input.userId, input.content);
    this.memoryManager.forgetFromMessage(input.userId, input.content);
    this.memoryManager.rememberConservativePreference(input.userId, input.content);

    try {
      const response = await this.aiRouter.generate(context);
      this.messages.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: response.content,
      });

      await this.summarizer.maybeSummarize(conversation.id);

      return {
        content: response.content,
        conversationId: conversation.id,
        provider: response.provider,
      };
    } catch (error) {
      logger.error(
        'AI pipeline failed: ' +
          (error instanceof Error ? error.message : String(error)),
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

  private toConversationInput(input: MessageRouterInput) {
    return {
      userId: input.userId,
      channelId: input.channelId,
      guildId: input.guildId,
      sharedChannel:
        input.guildId !== null &&
        this.isDedicatedAIChannel(input.guildId, input.channelId),
      ...(input.conversationId === undefined
        ? {}
        : { existingConversationId: input.conversationId }),
    };
  }
}
