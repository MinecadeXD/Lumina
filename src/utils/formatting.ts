export const DISCORD_RESPONSE_LIMIT = 1900;

export function formatDiscordResponse(content: string): string {
  const sanitized = content
    .replaceAll(String.fromCharCode(0), '')
    .replaceAll('@everyone', '@\u200beveryone')
    .replaceAll('@here', '@\u200bhere')
    .trim();

  if (sanitized.length <= DISCORD_RESPONSE_LIMIT) return sanitized;

  return truncateDiscordResponse(sanitized);
}

function truncateDiscordResponse(content: string): string {
  const closingFence = '\n\`\`\`';
  const hasUnclosedCodeBlock = (content.match(/\`\`\`/g)?.length ?? 0) % 2 === 1;
  const limit = hasUnclosedCodeBlock
    ? DISCORD_RESPONSE_LIMIT - closingFence.length
    : DISCORD_RESPONSE_LIMIT;

  let cutAt = limit;
  const newline = content.lastIndexOf('\n', limit);
  const space = content.lastIndexOf(' ', limit);
  const naturalBreak = Math.max(newline, space);
  if (naturalBreak > Math.floor(limit * 0.75)) cutAt = naturalBreak;

  let truncated = content.slice(0, cutAt).trimEnd();
  if (hasUnclosedCodeBlock) truncated += closingFence;
  return truncated;
}
