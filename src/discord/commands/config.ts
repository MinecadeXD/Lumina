import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';

export const configCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure Lumina for this server.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ai-channel')
        .setDescription('Set the dedicated AI channel.')
        .addChannelOption((option) => option.setName('channel').setDescription('Channel where Lumina will respond automatically.').setRequired(true).addChannelTypes(ChannelType.GuildText)),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('ai-channel-clear').setDescription('Disable the dedicated AI channel.'),
    ),
  async execute(interaction: ChatInputCommandInteraction, messageRouter: MessageRouter) {
    if (!interaction.inGuild() || !interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: 'You need the Manage Server permission to change Lumina configuration.', ephemeral: true });
      return;
    }
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'ai-channel') {
      const channel = interaction.options.getChannel('channel', true);
      messageRouter.setDedicatedAIChannel(interaction.guildId, channel.id);
      await interaction.reply({ content: `Dedicated AI channel set to <#${channel.id}>.`, ephemeral: true });
      return;
    }
    const cleared = messageRouter.clearDedicatedAIChannel(interaction.guildId);
    await interaction.reply({ content: cleared ? 'Dedicated AI channel disabled.' : 'No dedicated AI channel was configured.', ephemeral: true });
  },
};