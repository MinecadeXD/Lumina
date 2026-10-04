import type { AIRequest } from './provider.ts';
import { MessageRepository, ConversationRepository, MemoryRepository, SettingsRepository } from '../database/index.ts';
import type { MemoryRecord } from '../database/repositories/memories.ts';
import { SERVER_PERSONALITY_SETTING_KEY, SystemPromptBuilder } from './systemPrompt.ts';

export interface ContextBuilderOptions {
  maxContextTokens: number;
  recentMessages: number;
  maxSummaryTokens: number;
  maxMemories: number;
  maxMemoryTokens: number;
  maxOutputTokens: number;
}

export class ContextBuilder {
  public constructor(
    private readonly messages: MessageRepository,
    private readonly conversations: ConversationRepository,
    private readonly memories: MemoryRepository,
    private readonly settings: SettingsRepository,
    private readonly systemPromptBuilder: SystemPromptBuilder,
    private readonly options: ContextBuilderOptions,
  ) {}

  public build(
    conversationId: number,
    userId: string,
    currentMessage: string,
    timeoutMs = 30_000,
  ): AIRequest {
    const conversation = this.conversations.getById(conversationId);
    const summary = conversation?.summary
      ? this.truncateToTokens(conversation.summary, this.options.maxSummaryTokens)
      : null;
    const recent = this.messages.listByConversation(conversationId, this.options.recentMessages);
    const userMemories = conversation?.scopeType === 'channel'
      ? []
      : this.memories.listByUser(userId, this.options.maxMemories);
    const memoryText = this.buildMemoryContext(userMemories);
    const serverInstructions = conversation?.guildId
      ? this.settings.get('guild', conversation.guildId, SERVER_PERSONALITY_SETTING_KEY)?.value
      : null;

    const contextMessages = [
      {
        role: 'system' as const,
        content: this.systemPromptBuilder.build(serverInstructions),
      },
      ...(summary ? [{ role: 'system' as const, content: 'Conversation summary:\n' + summary }] : []),
      ...(memoryText ? [{ role: 'system' as const, content: 'Relevant long-term memories for this user:\n' + memoryText }] : []),
      ...recent.map((message) => ({ role: message.role, content: message.content })),
    ];

    const current = { role: 'user' as const, content: currentMessage };
    const budget = Math.max(1, this.options.maxContextTokens);

    while (
      contextMessages.length > 1 &&
      this.estimateTokens(contextMessages) + this.estimateTokens([current]) > budget
    ) {
      const removableIndex = contextMessages.findIndex((message) => message.role !== 'system');
      if (removableIndex < 0) break;
      contextMessages.splice(removableIndex, 1);
    }

    return {
      model: '',
      messages: [...contextMessages, current],
      maxTokens: this.options.maxOutputTokens,
      timeoutMs,
    };
  }

  private buildMemoryContext(memories: readonly MemoryRecord[]): string {
    if (memories.length === 0) return '';
    return this.truncateToTokens(
      memories.map((memory) => '- ' + memory.content).join('\n'),
      this.options.maxMemoryTokens,
    );
  }

  private estimateTokens(messages: readonly { content: string }[]): number {
    return Math.ceil(messages.reduce((total, message) => total + message.content.length, 0) / 4);
  }

  private truncateToTokens(content: string, maxTokens: number): string {
    const maxCharacters = Math.max(1, Math.floor(maxTokens * 4));
    if (content.length <= maxCharacters) return content;
    return content.slice(0, maxCharacters).trimEnd() + '…';
  }
}
