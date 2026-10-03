import type { Message, ChatInputCommandInteraction } from 'discord.js';
import {
  DISCORD_RESPONSE_LIMIT,
  DISCORD_RESPONSE_TOO_LONG,
  formatDiscordResponse,
} from '../../utils/formatting.ts';

const ALLOWED_MENTION_POLICY = { parse: ['users', 'roles'] as ('users' | 'roles')[] };

export async function sendTypingIndicator(message: Message): Promise<void> {
  if ('sendTyping' in message.channel && typeof message.channel.sendTyping === 'function') {
    await message.channel.sendTyping();
  }
}

export async function respondToMessage(message: Message, content: string): Promise<void> {
  const formatted = formatDiscordResponse(content);
  const safeContent = formatted.length <= DISCORD_RESPONSE_LIMIT
    ? formatted
    : DISCORD_RESPONSE_TOO_LONG;

  await message.reply({
    content: safeContent || 'Lumina did not return a response.',
    allowedMentions: { ...ALLOWED_MENTION_POLICY, repliedUser: false },
  });
}

export async function respondToInteraction(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  const formatted = formatDiscordResponse(content);
  const safeContent = formatted.length <= DISCORD_RESPONSE_LIMIT
    ? formatted
    : DISCORD_RESPONSE_TOO_LONG;

  if (!interaction.replied && !interaction.deferred) await interaction.deferReply();

  await interaction.editReply({
    content: safeContent || 'Lumina did not return a response.',
    allowedMentions: ALLOWED_MENTION_POLICY,
  });
}

export async function respondToError(
  message: Message,
  content = 'Lumina could not process that request.',
): Promise<void> {
  await respondToMessage(message, content);
}

export const discordErrorResponse = {
  content: 'Lumina encountered a Discord error while handling that request.',
  ephemeral: true,
};
