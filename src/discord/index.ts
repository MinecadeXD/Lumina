import type { Client } from 'discord.js';
import { registerCommands } from './commandRegistrar.js';
import { loadCommands } from './commands/index.js';
import { registerInteractionCreateEvent } from './events/interactionCreate.js';
import { registerMessageCreateEvent } from './events/messageCreate.js';
import { registerReadyEvent } from './events/ready.js';
import type { EnvironmentConfig } from '../config/environment.js';

export function registerDiscordEvents(client: Client): void {
  registerReadyEvent(client);
  registerMessageCreateEvent(client);
  registerInteractionCreateEvent(client);
}

export async function initializeDiscord(
  client: Client,
  environment: EnvironmentConfig,
): Promise<void> {
  await registerCommands(environment, loadCommands());
}