import type { AIRouter } from './aiRouter.ts';
import type { AIMessage } from './provider.ts';
import { MessageRepository, ConversationRepository } from '../database/index.ts';
import { logger } from '../logging/logger.ts';

export interface SummarizerOptions {
  triggerMessages: number;
  sourceMessages: number;
  recentMessagesToKeep: number;
  maxTokens: number;
  timeoutMs: number;
}

export class ConversationSummarizer {
  public constructor(
    private readonly aiRouter: AIRouter,
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly options: SummarizerOptions,
  ) {}

  public async maybeSummarize(conversationId: number): Promise<void> {
    const count = this.messages.countByConversation(conversationId);
    const conversation = this.conversations.getById(conversationId);
    if (!conversation) return;
    if (count - conversation.summaryMessageCount <= this.options.triggerMessages) return;

    const history = this.messages.listByConversation(conversationId, this.options.sourceMessages);
    const cutoff = Math.max(0, history.length - this.options.recentMessagesToKeep);
    const olderMessages = history.slice(0, cutoff);
    if (olderMessages.length === 0) return;

    const historyText = olderMessages
      .map((message) => message.role + ': ' + message.content)
      .join('\n');
    const existingSummary = conversation.summary
      ? 'Existing summary:\n' + conversation.summary + '\n\n'
      : '';

    const messages: AIMessage[] = [
      {
        role: 'system',
        content:
          'You summarize Discord conversations for future AI context. ' +
          'Preserve important facts, user preferences, decisions, unresolved questions, ' +
          'ongoing tasks, and relevant conversational context. Be concise and factual. ' +
          'Do not invent details. Return only the replacement summary in plain text.',
      },
      {
        role: 'user',
        content:
          existingSummary +
          'Conversation messages to incorporate:\n' +
          historyText +
          '\n\nWrite one concise replacement summary that preserves the useful context ' +
          'from the existing summary and these messages.',
      },
    ];

    try {
      const response = await this.aiRouter.generate({
        messages,
        model: '',
        maxTokens: this.options.maxTokens,
        timeoutMs: this.options.timeoutMs,
      });
      const summary = response.content.trim();
      if (!summary) return;
      this.conversations.updateSummary(conversationId, summary, count);
      logger.debug('Updated conversation summary for conversation #' + conversationId + '.');
    } catch (error) {
      logger.warn(
        'Conversation summarization failed for #' + conversationId + '; keeping the existing summary. ' +
        (error instanceof Error ? error.message : String(error)),
      );
    }
  }
}