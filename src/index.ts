import { createDiscordClient } from './discord/client.ts';
import { initializeDiscord, registerDiscordEvents } from './discord/index.ts';
import { loadEnvironment } from './config/environment.ts';
import { logger } from './logging/logger.ts';

async function main(): Promise<void> {
  const environment = loadEnvironment();
  logger.configure(environment.logLevel);

  const client = createDiscordClient();
  registerDiscordEvents(client);

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info(`Received ${signal}; shutting down Lumina.`);
    client.destroy();
    logger.info('Lumina shutdown complete.');
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await initializeDiscord(client, environment);
    await client.login(environment.discordToken);
  } catch (error) {
    logger.fatal(error);
    client.destroy();
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  logger.fatal(error);
  process.exitCode = 1;
});
