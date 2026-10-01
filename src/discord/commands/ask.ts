import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';

export const askCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Send a message to Lumina.'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Lumina is connected. AI processing will be added in a later phase.',
      ephemeral: true,
    });
  },
};