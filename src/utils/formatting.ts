export const DISCORD_RESPONSE_LIMIT = 1900;

export const DISCORD_RESPONSE_TOO_LONG =
  'That response would be too long for one Discord message. Please ask me to shorten it or split the request into smaller parts.';

export function formatDiscordResponse(content: string): string {
  return content
    .replaceAll(String.fromCharCode(0), '')
    .replaceAll('@everyone', '@\u200beveryone')
    .replaceAll('@here', '@\u200bhere')
    .trim();
}

export function isDiscordResponseWithinLimit(content: string): boolean {
  return formatDiscordResponse(content).length <= DISCORD_RESPONSE_LIMIT;
}
