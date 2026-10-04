import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';

export const clearCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear Lumina data.')
    .addSubcommand((subcommand) => subcommand
      .setName('conversation')
      .setDescription('Clear the current conversation.')
      .addBooleanOption((option) => option.setName('confirm').setDescription('Confirm deletion.').setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('memory')
      .setDescription('Clear all of your saved memories.')
      .addBooleanOption((option) => option.setName('confirm').setDescription('Confirm deletion.').setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('all')
      .setDescription('Clear your conversations and memories.')
      .addBooleanOption((option) => option.setName('confirm').setDescription('Confirm deletion.').setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction, messageRouter: MessageRouter) {
    const subcommand = interaction.options.getSubcommand();
    const confirm = interaction.options.getBoolean('confirm', true);
    if (!confirm) {
      await interaction.reply({content: 'Nothing was cleared. Set confirm to true to proceed.', ephemeral: true});
      return;
    }

    if (subcommand === 'conversation') {
      if (interaction.guildId && messageRouter.isDedicatedAIChannel(interaction.guildId, interaction.channelId) &&
          !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({content: 'Only server managers can clear the shared dedicated AI conversation.', ephemeral: true});
        return;
      }
      const member = interaction.member;
      const cleared = messageRouter.clearCurrentConversation({
        content: '',
        userId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        permissionContext: {
          isAdministrator: interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false,
          roleIds: member && 'roles' in member
            ? (Array.isArray(member.roles) ? member.roles : member.roles.cache.map((role) => role.id))
            : [],
        },
      });
      await interaction.reply({content: cleared ? 'Current conversation and its messages were cleared.' : 'There is no active conversation to clear.', ephemeral: true});
      return;
    }

    if (subcommand === 'memory') {
      const result = messageRouter.resetUserData('__unused__');
      void result;
      await interaction.reply({content: 'Use /memory clear to clear saved memories.', ephemeral: true});
      return;
    }

    const result = messageRouter.resetUserData(interaction.user.id);
    await interaction.reply({
      content: result.conversations || result.memories
        ? 'Cleared your saved conversations (' + result.conversations + ') and memories (' + result.memories + ').'
        : 'You had no saved conversations or memories to clear.',
      ephemeral: true,
    });
  },
};