import type { Client, Interaction } from 'discord.js';
import { loadCommands } from '../commands/index.js';
import { logger } from '../../logging/logger.js';

export function registerInteractionCreateEvent(client: Client): void {
  const commands = loadCommands();

  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.find(({ data }) => data.name === interaction.commandName);
    if (!command) {
      await interaction.reply({
        content: 'That command is not available right now.',
        ephemeral: true,
      });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(
        `Command /${interaction.commandName} failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      const response = {
        content: 'Lumina could not complete that command.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response).catch(() => undefined);
      } else {
        await interaction.reply(response).catch(() => undefined);
      }
    }
  });
}