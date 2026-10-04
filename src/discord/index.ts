import type { Client } from 'discord.js';
import { registerCommands } from './commandRegistrar.ts';
import { loadCommands } from './commands/index.ts';
import { registerInteractionCreateEvent } from './events/interactionCreate.ts';
import { registerDiscordErrorEvent } from './events/error.ts';
import { registerMessageCreateEvent } from './events/messageCreate.ts';
import { registerReadyEvent } from './events/ready.ts';
import type { EnvironmentConfig } from '../config/environment.ts';
import type { MessageRouter } from '../core/messageRouter.ts';
import type { MemoryManager } from '../memory/memoryManager.ts';

export function registerDiscordEvents(
  client: Client,
  messageRouter: MessageRouter,
  memoryManager: MemoryManager,
  environment: EnvironmentConfig,
): void {
  registerReadyEvent(client);
  registerMessageCreateEvent(client, messageRouter, environment.discordGuildId);
  registerInteractionCreateEvent(
    client,
    messageRouter,
    memoryManager,
    environment.discordGuildId,
  );
  registerDiscordErrorEvent(client);
}

export async function initializeDiscord(
  client: Client,
  environment: EnvironmentConfig,
  _messageRouter: MessageRouter,
): Promise<void> {
  await registerCommands(environment, loadCommands());
}
