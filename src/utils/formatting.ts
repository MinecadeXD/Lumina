const DISCORD_MESSAGE_LIMIT = 2000;

export function formatDiscordResponse(content: string): string {
  return content
    .replaceAll(String.fromCharCode(0), '')
    .replaceAll('@everyone', '@everyone')
    .replaceAll('@here', '@here')
    .trim();
}

export function splitDiscordMessage(content: string): string[] {
  const safeContent = formatDiscordResponse(content);
  if (!safeContent) return ['Lumina did not return a response.'];
  if (safeContent.length <= DISCORD_MESSAGE_LIMIT) return [safeContent];

  const chunks: string[] = [];
  const lines = safeContent.split('\n');
  let normalBuffer: string[] = [];
  let codeBuffer: string[] | null = null;
  let codeLanguage = '';

  const flushNormal = (): void => {
    if (normalBuffer.length === 0) return;
    const text = normalBuffer.join('\n').trim();
    normalBuffer = [];
    if (text) chunks.push(...splitPlainText(text));
  };

  const flushCode = (): void => {
    if (codeBuffer === null) return;
    const code = codeBuffer.join('\n');
    codeBuffer = null;
    const opening = codeLanguage ? '```' + codeLanguage + '\n' : '```\n';
    const closing = '\n```';
    const available = DISCORD_MESSAGE_LIMIT - opening.length - closing.length;
    for (const part of splitPlainText(code, Math.max(1, available))) {
      chunks.push(opening + part + closing);
    }
    codeLanguage = '';
  };

  for (const line of lines) {
    const fence = line.match(/^\s*```([^\s`]*)?\s*$/);
    if (fence) {
      if (codeBuffer === null) {
        flushNormal();
        codeBuffer = [];
        codeLanguage = fence[1] ?? '';
      } else {
        flushCode();
      }
      continue;
    }
    if (codeBuffer !== null) codeBuffer.push(line);
    else normalBuffer.push(line);
  }

  if (codeBuffer !== null) flushCode();
  flushNormal();
  return chunks.length > 0 ? chunks : ['Lumina did not return a response.'];
}

function splitPlainText(content: string, limit = DISCORD_MESSAGE_LIMIT): string[] {
  if (content.length <= limit) return [content];
  const chunks: string[] = [];
  let remaining = content;
  while (remaining.length > limit) {
    let splitAt = findSplitPoint(remaining, limit);
    if (splitAt <= 0) splitAt = limit;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
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
