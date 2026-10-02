import type { AIRequest } from './provider.ts';
import { MessageRepository } from '../database/index.ts';

export class ContextBuilder {
  public constructor(private readonly messages: MessageRepository) {}

  public build(conversationId: number, currentMessage: string): AIRequest {
    const history = this.messages.listByConversation(conversationId, 20);

    return {
      model: '',
      messages: [
        ...history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: 'user' as const,
          content: currentMessage,
        },
      ],
      timeoutMs: 30_000,
    };
  }
}
