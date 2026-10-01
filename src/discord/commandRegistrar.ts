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

  const route = environment.discordGuildId
    ? Routes.applicationGuildCommands(environment.discordClientId, environment.discordGuildId)
    : Routes.applicationCommands(environment.discordClientId);

  logger.info(
    environment.discordGuildId
      ? `Registering ${body.length} guild slash command(s).`
      : `Registering ${body.length} global slash command(s).`,
  );

  await rest.put(route, { body });
  logger.info('Slash commands registered.');
}