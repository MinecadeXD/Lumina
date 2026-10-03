import type { Client, Message } from 'discord.js';
import { logger } from '../../logging/logger.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';
import { respondToMessage } from '../responses/responder.ts';

export function registerMessageCreateEvent(
  client: Client,
  messageRouter: MessageRouter,
): void {
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    const mentioned = message.mentions.users.has(client.user?.id ?? '');
    const isReplyToLumina =
      message.reference?.messageId !== undefined &&
      await isLuminaReply(message, client);

    const isDedicatedChannel =
      message.guildId !== null &&
      messageRouter.isDedicatedAIChannel(message.guildId, message.channelId);

    const isDM = message.guildId === null;

    if (!mentioned && !isReplyToLumina && !isDedicatedChannel && !isDM) return;

    let content = message.content.trim();
    if (client.user) content = content.replaceAll('<@' + client.user.id + '>', '').trim();
    if (!content) {
      await respondToMessage(message, 'Hi! What would you like to talk about?');
      return;
    }

    try {
      if ('sendTyping' in message.channel && typeof message.channel.sendTyping === 'function') {
        await message.channel.sendTyping();
      }

      const result = await messageRouter.process({
        content,
        userId: message.author.id,
        channelId: message.channelId,
        guildId: message.guildId,
      });

      await respondToMessage(message, result.content);
    } catch (error) {
      logger.error(
        'Message pipeline failed: ' +
        (error instanceof Error ? error.message : String(error)),
      );
      await respondToMessage(message, 'Lumina could not process that request.');
    }
  });
}

async function isLuminaReply(message: Message, client: Client): Promise<boolean> {
  if (!message.reference?.messageId || !client.user) return false;

  try {
    const referenced = await message.fetchReference();
    return referenced.author.id === client.user.id;
  } catch {
    return false;
  }
}
