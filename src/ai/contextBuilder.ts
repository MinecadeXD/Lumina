import type { AIRequest } from './provider.ts';
import { MessageRepository } from '../database/index.ts';
import { LUMINA_SYSTEM_IDENTITY } from './identity.ts';

export class ContextBuilder {
  public constructor(private readonly messages: MessageRepository) {}

  public build(conversationId: number, currentMessage: string, timeoutMs = 30_000): AIRequest {
    const history = this.messages.listByConversation(conversationId, 20);

    return {
      model: '',
      messages: [
        { role: 'system', content: LUMINA_SYSTEM_IDENTITY },
        ...history.map((message) => ({ role: message.role, content: message.content })),
        { role: 'user' as const, content: currentMessage },
      ],
      timeoutMs,
    };
  }
}