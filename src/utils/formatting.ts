const DISCORD_MESSAGE_LIMIT = 2000;

export function formatDiscordResponse(content: string): string {
  return content
    .replaceAll('@everyone', '@\u200Beveryone')
    .replaceAll('@here', '@\u200Bhere')
    .replace(/<@!?&?(\d+)>/g, '<@\u200B$1>')
    .trim();
}

export function splitDiscordMessage(content: string): string[] {
  const safeContent = formatDiscordResponse(content);
  if (safeContent.length <= DISCORD_MESSAGE_LIMIT) return [safeContent];
  const chunks: string[] = [];
  let remaining = safeContent;
  let codeFenceOpen = false;
  while (remaining.length > DISCORD_MESSAGE_LIMIT) {
    let splitAt = findSplitPoint(remaining, DISCORD_MESSAGE_LIMIT);
    if (splitAt <= 0) splitAt = DISCORD_MESSAGE_LIMIT;
    let chunk = remaining.slice(0, splitAt).trimEnd();
    remaining = remaining.slice(splitAt).trimStart();
    if (codeFenceOpen) {
      chunk += '\n```';
      remaining = '```' + (remaining ? '\n' + remaining : '');
    }
    codeFenceOpen = updateCodeFenceState(chunk);
    chunks.push(chunk);
  }
  if (remaining) chunks.push(remaining);
  return chunks.length > 0 ? chunks : [''];
}

function findSplitPoint(content: string, limit: number): number {
  const candidate = content.slice(0, limit);
  const newline = candidate.lastIndexOf('\n');
  if (newline > 0) return newline;
  const space = candidate.lastIndexOf(' ');
  if (space > 0) return space;
  return limit;
}

function updateCodeFenceState(content: string): boolean {
  let count = 0;
  let index = content.indexOf('```');
  while (index !== -1) { count += 1; index = content.indexOf('```', index + 3); }
  return count % 2 === 1;
}