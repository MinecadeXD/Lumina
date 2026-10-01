import type { Client } from 'discord.js';
import { registerCommands } from './commandRegistrar.ts';
import { loadCommands } from './commands/index.ts';
import { registerInteractionCreateEvent } from './events/interactionCreate.ts';
import { registerDiscordErrorEvent } from './events/error.ts';
import { registerMessageCreateEvent } from './events/messageCreate.ts';
import { registerReadyEvent } from './events/ready.ts';
import type { EnvironmentConfig } from '../config/environment.ts';

export function registerDiscordEvents(client: Client): void {
  registerReadyEvent(client);
  registerMessageCreateEvent(client);
  registerInteractionCreateEvent(client);
  registerDiscordErrorEvent(client);
}

export async function initializeDiscord(
  client: Client,
  environment: EnvironmentConfig,
): Promise<void> {
  await registerCommands(environment, loadCommands());
}