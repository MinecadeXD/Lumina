import type { Client } from 'discord.js';
import { registerCommands } from './commandRegistrar.ts';
import { loadCommands } from './commands/index.ts';
import { registerInteractionCreateEvent } from './events/interactionCreate.ts';
import { registerDiscordErrorEvent } from './events/error.ts';
import { registerMessageCreateEvent } from './events/messageCreate.ts';
import { registerReadyEvent } from './events/ready.ts';
import type { EnvironmentConfig } from '../config/environment.ts';
import type { MessageRouter } from '../core/messageRouter.ts';

export function registerDiscordEvents(
  client: Client,
  messageRouter: MessageRouter,
): void {
  registerReadyEvent(client);
  registerMessageCreateEvent(client, messageRouter);
  registerInteractionCreateEvent(client, messageRouter);
  registerDiscordErrorEvent(client);
}

export async function initializeDiscord(
  client: Client,
  environment: EnvironmentConfig,
  _messageRouter: MessageRouter,
): Promise<void> {
  await registerCommands(environment, loadCommands());
}
