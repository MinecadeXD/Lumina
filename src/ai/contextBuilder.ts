import type { AIRequest } from './provider.ts';
import { MessageRepository, ConversationRepository } from '../database/index.ts';
import { LUMINA_SYSTEM_IDENTITY } from './identity.ts';

export interface ContextBuilderOptions {
  maxContextTokens: number;
  recentMessages: number;
  maxSummaryTokens: number;
}

export class ContextBuilder {
  public constructor(
    private readonly messages: MessageRepository,
    private readonly conversations: ConversationRepository,
    private readonly options: ContextBuilderOptions,
  ) {}

  public build(
    conversationId: number,
    currentMessage: string,
    timeoutMs = 30_000,
  ): AIRequest {
    const conversation = this.conversations.getById(conversationId);
    const summary = conversation?.summary
      ? this.truncateToTokens(conversation.summary, this.options.maxSummaryTokens)
      : null;

    const recent = this.messages.listByConversation(
      conversationId,
      this.options.recentMessages,
    );

    const contextMessages = [
      { role: 'system' as const, content: LUMINA_SYSTEM_IDENTITY },
      ...(summary
        ? [{
            role: 'system' as const,
            content: 'Conversation summary:\n' + summary,
          }]
        : []),
      ...recent.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const current = { role: 'user' as const, content: currentMessage };
    const budget = Math.max(1, this.options.maxContextTokens);

    while (
      contextMessages.length > 2 &&
      this.estimateTokens(contextMessages) + this.estimateTokens([current]) > budget
    ) {
      const removableIndex = contextMessages.findIndex(
        (message) => message.role !== 'system' || message.content !== LUMINA_SYSTEM_IDENTITY,
      );
      if (removableIndex < 0) break;
      contextMessages.splice(removableIndex, 1);
    }

    return {
      model: '',
      messages: [...contextMessages, current],
      timeoutMs,
    };
  }

  private estimateTokens(
    messages: readonly { content: string }[],
  ): number {
    return Math.ceil(
      messages.reduce((total, message) => total + message.content.length, 0) / 4,
    );
  }

  private truncateToTokens(content: string, maxTokens: number): string {
    const maxCharacters = Math.max(1, Math.floor(maxTokens * 4));
    if (content.length <= maxCharacters) return content;
    return content.slice(0, maxCharacters).trimEnd() + '…';
  }
}
