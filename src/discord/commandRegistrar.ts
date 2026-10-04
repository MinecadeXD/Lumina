import { REST, Routes } from 'discord.js';
import type { Command } from './commands/types.ts';
import type { EnvironmentConfig } from '../config/environment.ts';
import { logger } from '../logging/logger.ts';

export async function registerCommands(
  environment: EnvironmentConfig,
  commands: readonly Command[],
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(environment.discordToken);
  const body = commands.map((command) => command.data.toJSON());
  const route = Routes.applicationGuildCommands(
    environment.discordClientId,
    environment.discordGuildId,
  );

  logger.info(
    `Registering ${body.length} guild slash command(s) for the configured Lumina server.`,
  );

  await rest.put(route, { body });
  logger.info('Slash commands registered.');
}
