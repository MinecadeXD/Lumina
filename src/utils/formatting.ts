export const DISCORD_RESPONSE_LIMIT = 1900;

export function formatDiscordResponse(content: string): string {
  const normalized = normalizeDiscordFormatting(
    content
      .replaceAll(String.fromCharCode(0), '')
      .replaceAll('@everyone', '@\u200beveryone')
      .replaceAll('@here', '@\u200bhere')
      .trim(),
  );

  if (normalized.length <= DISCORD_RESPONSE_LIMIT) return normalized;

  return truncateDiscordResponse(normalized);
}

function normalizeDiscordFormatting(content: string): string {
  return content
    .split(/(```[\\s\\S]*?(?:```|$))/g)
    .map((part) => {
      if (part.startsWith('```')) return part;

      return part
        .replace(/^#{1,6}\s+(.+)$/gm, '**$1**')
        .replace(/^(\s*)[*-]\s+/gm, '$1• ')
        .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
        .replace(/\$([^$\n]+)\$/g, '$1');
    })
    .join('');
}

function truncateDiscordResponse(content: string): string {
  const closingFence = '\n```';
  const hasUnclosedCodeBlock = (content.match(/```/g)?.length ?? 0) % 2 === 1;
  const limit = hasUnclosedCodeBlock
    ? DISCORD_RESPONSE_LIMIT - closingFence.length
    : DISCORD_RESPONSE_LIMIT;

  let cutAt = limit;
  const newline = content.lastIndexOf('\n', limit);
  const space = content.lastIndexOf(' ', limit);
  const naturalBreak = Math.max(newline, space);

  if (naturalBreak > Math.floor(limit * 0.75)) {
    cutAt = naturalBreak;
  }

  let truncated = content.slice(0, cutAt).trimEnd();

  if (hasUnclosedCodeBlock) {
    truncated += closingFence;
  }

  return truncated;
}
