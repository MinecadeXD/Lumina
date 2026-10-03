const DISCORD_MESSAGE_LIMIT = 2000;

export function splitDiscordMessage(content: string): string[] {
  if (content.length <= DISCORD_MESSAGE_LIMIT) return [content];

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > DISCORD_MESSAGE_LIMIT) {
    const limit = DISCORD_MESSAGE_LIMIT;
    let splitAt = remaining.lastIndexOf('\n', limit);

    if (splitAt <= 0) {
      splitAt = remaining.lastIndexOf(' ', limit);
    }

    if (splitAt <= 0) {
      splitAt = limit;
    }

    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining.length > 0) chunks.push(remaining);

  return chunks.length > 0 ? chunks : [''];
}
