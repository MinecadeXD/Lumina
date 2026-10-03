import type { Message, ChatInputCommandInteraction } from 'discord.js';
import { splitDiscordMessage } from '../../utils/formatting.ts';

const SAFE_MENTION_POLICY = { parse: [] as ('users' | 'roles' | 'everyone')[] };

export async function sendTypingIndicator(message: Message): Promise<void> {
  if ('sendTyping' in message.channel && typeof message.channel.sendTyping === 'function') {
    await message.channel.sendTyping();
  }
}

export async function respondToMessage(message: Message, content: string): Promise<void> {
  const chunks = splitDiscordMessage(content);
  for (const chunk of chunks) {
    await message.reply({
      content: chunk,
      allowedMentions: { ...SAFE_MENTION_POLICY, repliedUser: false },
    });
  }
}

export async function respondToInteraction(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  const chunks = splitDiscordMessage(content);
  if (!interaction.replied && !interaction.deferred) await interaction.deferReply();

  await interaction.editReply({
    content: chunks[0] ?? 'Lumina did not return a response.',
    allowedMentions: SAFE_MENTION_POLICY,
  });

  for (const chunk of chunks.slice(1)) {
    await interaction.followUp({ content: chunk, allowedMentions: SAFE_MENTION_POLICY });
  }
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