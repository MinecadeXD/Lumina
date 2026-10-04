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
        .replace(/\$\$([\s\\S]*?)\$\$/g, '$1')
        .replace(/\$([^$\n]+)\$/g, '$1');
    })
    .join('');
}

function truncateDiscordResponse(content: string): string {
  const closingFence = '\n```';
  let cutAt = DISCORD_RESPONSE_LIMIT;

  const newline = content.lastIndexOf('\n', cutAt);
  const space = content.lastIndexOf(' ', cutAt);
  const naturalBreak = Math.max(newline, space);

  if (naturalBreak > Math.floor(cutAt * 0.75)) {
    cutAt = naturalBreak;
  }

  let truncated = content.slice(0, cutAt).trimEnd();
  const isInsideCodeBlock =
    (truncated.match(/```/g)?.length ?? 0) % 2 === 1;

  if (isInsideCodeBlock) {
    cutAt = DISCORD_RESPONSE_LIMIT - closingFence.length;
    const codeNewline = content.lastIndexOf('\n', cutAt);
    const codeSpace = content.lastIndexOf(' ', cutAt);
    const codeBreak = Math.max(codeNewline, codeSpace);

    if (codeBreak > Math.floor(cutAt * 0.75)) {
      cutAt = codeBreak;
    }

    truncated = content.slice(0, cutAt).trimEnd() + closingFence;
  }

  return truncated;
}
