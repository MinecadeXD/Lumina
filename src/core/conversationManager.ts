import { ConversationRepository, type ConversationRecord, type ConversationScope } from '../database/index.ts';

export interface ConversationInput {
  userId: string;
  channelId: string;
  guildId: string | null;
  sharedChannel: boolean;
  existingConversationId?: number;
}

export class ConversationManager {
  public constructor(private readonly conversations: ConversationRepository) {}

  public getOrCreate(input: ConversationInput): ConversationRecord {
    if (input.existingConversationId !== undefined) {
      const existing = this.conversations.getById(input.existingConversationId);
      if (existing) {
        this.conversations.touch(existing.id);
        return existing;
      }
    }

    const scopeType: ConversationScope = input.guildId === null
      ? 'dm'
      : input.sharedChannel
        ? 'channel'
        : 'user-channel';

    const userId = scopeType === 'channel' ? null : input.userId;
    const active = this.conversations.findActive(scopeType, userId, input.channelId);

    if (active) {
      this.conversations.touch(active.id);
      return active;
    }

    return this.conversations.create({
      scopeType,
      userId,
      channelId: input.channelId,
      guildId: input.guildId,
    });
  }
}
