export function normalizeProviderContent(value: unknown): string {
  if (typeof value === 'string') return cleanText(value);

  if (Array.isArray(value)) {
    return cleanText(
      value.map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part !== 'object' || part === null) return '';
        if ('text' in part && typeof part.text === 'string') return part.text;
        if ('content' in part && typeof part.content === 'string') return part.content;
        return '';
      }).join(''),
    );
  }

  return '';
}

function cleanText(value: string): string {
  return value
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}