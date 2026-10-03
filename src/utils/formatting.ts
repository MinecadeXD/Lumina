const DISCORD_MESSAGE_LIMIT = 2000;

export function formatDiscordResponse(content: string): string {
  return content
    .replaceAll(String.fromCharCode(0), '')
    .replaceAll('@everyone', '@\u200Beveryone')
    .replaceAll('@here', '@\u200Bhere')
    .replace(/<@!?(\d+)>/g, '<@\u200B$1>')
    .replace(/<@&(\d+)>/g, '<@&\u200B$1>')
    .trim();
}

export function splitDiscordMessage(content: string): string[] {
  const safeContent = formatDiscordResponse(content);
  if (!safeContent) return ['Lumina did not return a response.'];
  if (safeContent.length <= DISCORD_MESSAGE_LIMIT) return [safeContent];

  const chunks: string[] = [];
  let remaining = safeContent;
  let codeFenceOpen = false;

  while (remaining.length > DISCORD_MESSAGE_LIMIT) {
    const splitLimit = codeFenceOpen ? DISCORD_MESSAGE_LIMIT - 4 : DISCORD_MESSAGE_LIMIT;
    let splitAt = findSplitPoint(remaining, splitLimit);
    if (splitAt <= 0) splitAt = splitLimit;

    let chunk = remaining.slice(0, splitAt).trimEnd();
    remaining = remaining.slice(splitAt).trimStart();
    const nextCodeFenceOpen = toggleCodeFenceState(chunk);

    if (codeFenceOpen) chunk += '\n```';
    if (nextCodeFenceOpen) remaining = '```\n' + remaining;

    codeFenceOpen = nextCodeFenceOpen;
    chunks.push(chunk.slice(0, DISCORD_MESSAGE_LIMIT));
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function findSplitPoint(content: string, limit: number): number {
  const candidate = content.slice(0, limit);
  const newline = candidate.lastIndexOf('\n');
  if (newline > 0) return newline;
  const space = candidate.lastIndexOf(' ');
  if (space > 0) return space;
  return limit;
}

function toggleCodeFenceState(content: string): boolean {
  let count = 0;
  let index = content.indexOf('```');
  while (index !== -1) {
    count += 1;
    index = content.indexOf('```', index + 3);
  }
  return count % 2 === 1;
}