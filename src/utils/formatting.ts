export const DISCORD_RESPONSE_LIMIT = 1900;

export function formatDiscordResponse(content: string): string {
  const normalized = normalizeDiscordFormatting(
    content
      .replaceAll(String.fromCharCode(0), '')
      .replaceAll('@everyone', '@\u200beveryone')
      .replaceAll('@here', '@\u200bhere')
      .trim(),
  );

  return normalized;
}

function normalizeDiscordFormatting(content: string): string {
  return content
    .split(/(```[\\s\\S]*?(?:```|$))/g)
    .map((part) => {
      if (part.startsWith('```')) return part;

      return part
        .replace(/^#{1,6}\s+(.+)$/gm, '**$1**')
        .replace(/^(\s*)[*-]\s+/gm, '$1• ')
        .replace(/\$\$([\s\\S]*?)\$\$/g, '$1')
        .replace(/\$([^$\n]+)\$/g, '$1');
    })
    .join('');
}

