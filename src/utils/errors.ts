export class AppError extends Error {
  public readonly cause?: unknown;
  public constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.cause = cause;
  }
}

export class ConfigurationError extends AppError {
  public constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ConfigurationError';
  }
}

export class DatabaseError extends AppError {
  public constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'DatabaseError';
  }
}

const SECRET_KEY_PATTERN = /(token|api[_-]?key|authorization|password|secret|credential)/i;
const SECRET_VALUE_PATTERN = /(sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,}|[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{10,})/g;

export function redactSecrets(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(SECRET_VALUE_PATTERN, '[REDACTED]');
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) output[key] = SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : redactSecrets(item);
    return output;
  }
  return value;
}

export function safeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return String(redactSecrets(raw)).replace(/\s+/g, ' ').slice(0, 1000);
}
