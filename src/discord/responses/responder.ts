import type { InteractionReplyOptions } from 'discord.js';

export const discordErrorResponse: InteractionReplyOptions = {
  content: 'Lumina encountered a Discord error while handling that request.',
  ephemeral: true,
};