import { createDatabase, closeDatabase } from './database/index.ts';
import { AIRouter, GeminiProvider, GroqProvider, OpenRouterProvider } from './ai/index.ts';
import { createDiscordClient } from './discord/client.ts';
import { initializeDiscord, registerDiscordEvents } from './discord/index.ts';
import { loadEnvironment } from './config/environment.ts';
import { logger } from './logging/logger.ts';

async function main(): Promise<void> {
  const environment = loadEnvironment();
  logger.configure(environment.logLevel);

  const database = createDatabase();
  const aiRouter = new AIRouter({
    primary: environment.primaryAIProvider,
    fallbacks: environment.fallbackAIProviders,
  });

  aiRouter.register(new GeminiProvider(environment.geminiApiKey));
  aiRouter.register(new GroqProvider(environment.groqApiKey));
  aiRouter.register(new OpenRouterProvider(environment.openrouterApiKey));

  const availableProviders = aiRouter.availableProviders();
  if (availableProviders.length === 0) {
    logger.warn('No AI provider API keys are configured. AI requests will be unavailable.');
  } else {
    logger.info(`AI providers available: ${availableProviders.join(', ')}`);
  }

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
