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
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel where Lumina will respond automatically.')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ai-channel-clear')
        .setDescription('Disable the dedicated AI channel.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('personality')
        .setDescription('Set server-specific instructions for Lumina.')
        .addStringOption((option) =>
          option
            .setName('text')
            .setDescription('Instructions that customize Lumina for this server.')
            .setRequired(true)
            .setMaxLength(1500),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('personality-clear')
        .setDescription('Remove the server personality customization.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('personality-show')
        .setDescription('Show the server personality customization status.'),
    ),
  async execute(interaction: ChatInputCommandInteraction, messageRouter: MessageRouter) {
    if (!interaction.inGuild() || !interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: 'You need the Manage Server permission to change Lumina configuration.',
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ai-channel') {
      const channel = interaction.options.getChannel('channel', true);
      messageRouter.setDedicatedAIChannel(interaction.guildId, channel.id);
      await interaction.reply({
        content: `Dedicated AI channel set to <#${channel.id}>.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'ai-channel-clear') {
      const cleared = messageRouter.clearDedicatedAIChannel(interaction.guildId);
      await interaction.reply({
        content: cleared
          ? 'Dedicated AI channel disabled.'
          : 'No dedicated AI channel was configured.',
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'personality') {
      const text = interaction.options.getString('text', true);
      messageRouter.setServerPersonality(interaction.guildId, text);
      await interaction.reply({
        content: 'Server personality customization saved. It will be included in Lumina\'s system prompt for this server.',
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'personality-clear') {
      const cleared = messageRouter.clearServerPersonality(interaction.guildId);
      await interaction.reply({
        content: cleared
          ? 'Server personality customization removed. Lumina will use the configured default personality.'
          : 'No server personality customization was configured.',
        ephemeral: true,
      });
      return;
    }

    const personality = messageRouter.getServerPersonality(interaction.guildId);
    await interaction.reply({
      content: personality
        ? `Current server personality customization:\n${personality}`
        : 'No server personality customization is set. Lumina is using the configured default personality.',
      ephemeral: true,
    });
  },
};
