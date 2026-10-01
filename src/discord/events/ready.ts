import type { Client } from 'discord.js';
import { logger } from '../../logging/logger.js';

export function registerReadyEvent(client: Client): void {
  client.once('ready', (readyClient) => {
    logger.info(`Discord connected as ${readyClient.user.tag}`);
  });
}