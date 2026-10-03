import type { AIRouter } from '../ai/index.ts';
import { ConversationRepository, MessageRepository, SettingsRepository } from '../database/index.ts';
import { logger } from '../logging/logger.ts';
import { ConversationManager } from './conversationManager.ts';
import { PermissionService } from './permissions.ts';
import { ContextBuilder } from '../ai/contextBuilder.ts';

export interface MessageRouterInput {
  content: string; userId: string; channelId: string; guildId: string | null; conversationId?: number;
}
export interface MessageRouterResult { content: string; conversationId: number; provider: string; }

export class MessageRouter {
  private readonly conversations: ConversationManager;
  private readonly permissions = new PermissionService();
  private readonly contextBuilder: ContextBuilder;

  public constructor(
    private readonly aiRouter: AIRouter,
    conversationRepository: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly settings: SettingsRepository,
    private readonly aiTimeoutMs = 30_000,
  ) {
    this.conversations = new ConversationManager(conversationRepository);
    this.contextBuilder = new ContextBuilder(messages);
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
    const sharedChannel = input.guildId !== null && this.isDedicatedAIChannel(input.guildId, input.channelId);
    const conversationInput = {
      userId: input.userId, channelId: input.channelId, guildId: input.guildId, sharedChannel,
      ...(input.conversationId === undefined ? {} : { existingConversationId: input.conversationId }),
    };
    const conversation = this.conversations.getOrCreate(conversationInput);
    const context = this.contextBuilder.build(conversation.id, input.content, this.aiTimeoutMs);
    this.messages.create({ conversationId: conversation.id, userId: input.userId, role: 'user', content: input.content });

    try {
      const response = await this.aiRouter.generate(context);
      this.messages.create({ conversationId: conversation.id, role: 'assistant', content: response.content });
      return { content: response.content, conversationId: conversation.id, provider: response.provider };
    } catch (error) {
      logger.error('AI pipeline failed: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
}