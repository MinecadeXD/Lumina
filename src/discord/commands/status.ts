import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';

export const statusCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show safe Lumina diagnostics.'),

  async execute(interaction: ChatInputCommandInteraction, messageRouter: MessageRouter) {
    const status = messageRouter.getStatus();
    const discordStatus = interaction.client.isReady() ? 'online' : 'not ready';
    const providerState = status.providerAvailable ? 'available' : 'unavailable';

    const lines = [
      '**Lumina Status**',
      'Lumina: ' + discordStatus,
      'AI provider: ' + status.provider + ' (' + providerState + ')',
      'Model: ' + status.model,
      'Database: ' + (status.databaseHealthy ? 'healthy' : 'unavailable'),
      'AI channel only: ' + (status.aiChannelOnly ? 'enabled' : 'disabled'),
      'AI role restriction: ' + (status.aiRoleConfigured ? 'enabled' : 'disabled'),
      'Memory behavior: ' + status.memoryBehavior,
    ];

    if (status.aiChannel) lines.push('Dedicated AI channel: <#' + status.aiChannel + '>');
    lines.push(
      'Rate limits: user ' + status.rateLimits.user +
      ', provider ' + status.rateLimits.provider +
      ' per ' + status.rateLimits.windowSeconds + 's',
    );

    await interaction.reply({ content: lines.join('\n'), ephemeral: true });
  },
};
