import type { Client } from 'discord.js';
import { logger } from '../../logging/logger.js';

export function registerDiscordErrorEvent(client: Client): void {
  client.on('error', (error) => {
    logger.error(
      `Discord client error: ${error instanceof Error ? error.message : String(error)}`,
    );
  });
}
