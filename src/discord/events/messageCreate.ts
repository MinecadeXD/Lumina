import type { Client, Message } from 'discord.js';
import { logger } from '../../logging/logger.ts';

export function registerMessageCreateEvent(client: Client): void {
  client.on('messageCreate', (message: Message) => {
    if (message.author.bot) return;

    logger.debug(`Received Discord message in ${message.guildId ?? 'DM'}`);
  });
}