import type { Client } from 'discord.js';
import { logger } from '../../logging/logger.ts';

export function registerReadyEvent(client: Client): void {
  client.once('ready', (readyClient) => {
    logger.info(`Discord connected as ${readyClient.user.tag}`);
  });
}