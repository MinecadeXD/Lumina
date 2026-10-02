import type { Client, Interaction } from 'discord.js';
import { loadCommands } from '../commands/index.ts';
import { logger } from '../../logging/logger.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';
import { respondToInteraction } from '../responses/responder.ts';

export function registerInteractionCreateEvent(
  client: Client,
  messageRouter: MessageRouter,
): void {
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
      await command.execute(interaction, messageRouter);
    } catch (error) {
      logger.error(
        'Command /' + interaction.commandName + ' failed: ' +
        (error instanceof Error ? error.message : String(error)),
      );

      try {
        await respondToInteraction(
          interaction,
          'Lumina could not complete that request.',
        );
      } catch {
        // The interaction may already be expired or otherwise unavailable.
      }
    }
  });
}
