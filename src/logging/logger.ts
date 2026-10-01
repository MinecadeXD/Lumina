import type { LogLevel } from "../config/defaults.ts";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function shouldLog(current: LogLevel, messageLevel: LogLevel): boolean {
  return levelPriority[messageLevel] >= levelPriority[current];
}

function write(level: LogLevel, message: string, details?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (details === undefined) {
    console.log(`${prefix} ${message}`);
    return;
  }

  console.log(`${prefix} ${message}`, details);
}

function getConfiguredLevel(): LogLevel {
  const value = process.env.LOG_LEVEL;

  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }

  return "info";
}

export const logger = {
  debug(message: string, details?: unknown): void {
    const level = getConfiguredLevel();
    if (shouldLog(level, "debug")) write("debug", message, details);
  },

  info(message: string, details?: unknown): void {
    const level = getConfiguredLevel();
    if (shouldLog(level, "info")) write("info", message, details);
  },

  warn(message: string, details?: unknown): void {
    const level = getConfiguredLevel();
    if (shouldLog(level, "warn")) write("warn", message, details);
  },

  error(message: string, details?: unknown): void {
    const level = getConfiguredLevel();
    if (shouldLog(level, "error")) write("error", message, details);
  },

  fatal(error: unknown): void {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    write("error", message);
  }
};
