import type { Message, ChatInputCommandInteraction } from 'discord.js';
import { splitDiscordMessage } from '../../utils/formatting.ts';

export async function respondToMessage(message: Message, content: string): Promise<void> {
  for (const chunk of splitDiscordMessage(content)) {
    await message.reply({ content: chunk, allowedMentions: { repliedUser: false } });
  }
}

export async function respondToInteraction(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  const chunks = splitDiscordMessage(content);

  if (!interaction.replied && !interaction.deferred) {
    await interaction.deferReply();
  }

  await interaction.editReply({
    content: chunks[0] ?? 'Lumina did not return a response.',
    allowedMentions: { parse: [] },
  });

  for (const chunk of chunks.slice(1)) {
    await interaction.followUp({
      content: chunk,
      allowedMentions: { parse: [] },
    });
  }
}

export const discordErrorResponse = {
  content: 'Lumina encountered a Discord error while handling that request.',
  ephemeral: true,
};
