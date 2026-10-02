import type { AIRouter } from '../ai/index.ts';
import {
  ConversationRepository,
  MessageRepository,
  SettingsRepository,
} from '../database/index.ts';
import { logger } from '../logging/logger.ts';
import { ConversationManager } from './conversationManager.ts';
import { ContextBuilder } from '../ai/contextBuilder.ts';

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

export class MessageRouter {
  private readonly conversations: ConversationManager;
  private readonly contextBuilder: ContextBuilder;

  public constructor(
    private readonly aiRouter: AIRouter,
    conversationRepository: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly settings: SettingsRepository,
  ) {
    this.conversations = new ConversationManager(conversationRepository);
    this.contextBuilder = new ContextBuilder(messages);
  }

  public async process(input: MessageRouterInput): Promise<MessageRouterResult> {
    const sharedChannel = input.guildId !== null &&
      this.settings.get('guild', input.guildId, 'ai_channel_id')?.value === input.channelId;

    const conversation = this.conversations.getOrCreate({
      userId: input.userId,
      channelId: input.channelId,
      guildId: input.guildId,
      sharedChannel,
      existingConversationId: input.conversationId,
    });

    const context = this.contextBuilder.build(conversation.id, input.content);

    this.messages.create({
      conversationId: conversation.id,
      userId: input.userId,
      role: 'user',
      content: input.content,
    });

    try {
      const response = await this.aiRouter.generate(context);

      this.messages.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: response.content,
      });

      return {
        content: response.content,
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
}
