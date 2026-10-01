export class AppError extends Error {
  public readonly cause?: unknown;

  public constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
    this.cause = cause;
  }
}

export class ConfigurationError extends AppError {}

export class DatabaseError extends AppError {}
