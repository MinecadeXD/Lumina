import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';
import { respondToInteraction } from '../responses/responder.ts';

export const askCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Send a message to Lumina.')
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('What would you like to ask Lumina?')
        .setRequired(true),
    ),
  async execute(interaction: ChatInputCommandInteraction, messageRouter: MessageRouter) {
    const content = interaction.options.getString('message', true);
    await interaction.deferReply();

    const result = await messageRouter.process({
      content,
      userId: interaction.user.id,
      channelId: interaction.channelId,
      guildId: interaction.guildId,
    });

    await respondToInteraction(interaction, result.content);
  },
};
