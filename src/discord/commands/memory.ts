import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MemoryManager } from '../../memory/memoryManager.ts';

export const memoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('memory')
    .setDescription('Manage Lumina memories about you.')
    .addSubcommand((subcommand) => subcommand.setName('list').setDescription('List your saved memories.'))
    .addSubcommand((subcommand) => subcommand.setName('add').setDescription('Remember something about you.').addStringOption((option) => option.setName('text').setDescription('The information Lumina should remember.').setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName('remove').setDescription('Forget one of your memories.').addIntegerOption((option) => option.setName('id').setDescription('Memory ID from /memory list.').setRequired(true).setMinValue(1)))
    .addSubcommand((subcommand) => subcommand.setName('clear').setDescription('Forget all of your saved memories.').addBooleanOption((option) => option.setName('confirm').setDescription('Confirm deleting all memories.').setRequired(true))),
  async execute(interaction: ChatInputCommandInteraction, _messageRouter, memoryManager: MemoryManager) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    if (subcommand === 'list') {
      const memories = memoryManager.list(userId);
      if (memories.length === 0) { await interaction.reply({ content: 'I do not have any saved memories about you.', ephemeral: true }); return; }
      const lines = memories.map((memory) => '#' + memory.id + ' — ' + memory.content);
      await interaction.reply({ content: 'Your saved memories:\n' + lines.join('\n'), ephemeral: true }); return;
    }
    if (subcommand === 'add') {
      const memory = memoryManager.add(userId, interaction.options.getString('text', true));
      await interaction.reply({ content: 'I’ll remember: ' + memory.content, ephemeral: true }); return;
    }
    if (subcommand === 'remove') {
      const id = interaction.options.getInteger('id', true);
      const removed = memoryManager.remove(userId, id);
      await interaction.reply({ content: removed ? 'Forgot memory #' + id + '.' : 'Memory #' + id + ' was not found in your memories.', ephemeral: true }); return;
    }
    if (!interaction.options.getBoolean('confirm', true)) { await interaction.reply({ content: 'Your memories were not cleared. Set confirm to true to delete them.', ephemeral: true }); return; }
    const count = memoryManager.clear(userId);
    await interaction.reply({ content: count > 0 ? 'Forgot ' + count + ' saved memor' + (count === 1 ? 'y.' : 'ies.') : 'You had no saved memories.', ephemeral: true });
  },
};