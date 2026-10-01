import { createDatabase, closeDatabase } from './database/index.ts';
import { createDiscordClient } from './discord/client.ts';
import { initializeDiscord, registerDiscordEvents } from './discord/index.ts';
import { loadEnvironment } from './config/environment.ts';
import { logger } from './logging/logger.ts';

async function main(): Promise<void> {
  const environment = loadEnvironment();

  const database = createDatabase();
  const client = createDiscordClient();
  registerDiscordEvents(client);

  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Received ${signal}; shutting down Lumina.`);

    try {
      client.destroy();
    } finally {
      closeDatabase(database);
    }

    logger.info('Lumina shutdown complete.');
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await initializeDiscord(client, environment);
    await client.login(environment.discordToken);
  } catch (error) {
    logger.fatal(error);

    try {
      client.destroy();
    } finally {
      closeDatabase(database);
    }

    process.exitCode = 1;
  }
}

void main().catch((error) => {
  logger.fatal(error);
  process.exitCode = 1;
});
