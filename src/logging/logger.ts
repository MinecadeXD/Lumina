import type { LogLevel } from "../config/defaults.ts";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

let configuredLevel: LogLevel = "info";

function shouldLog(current: LogLevel, messageLevel: LogLevel): boolean {
  return levelPriority[messageLevel] >= levelPriority[current];
}

function write(level: LogLevel, message: string, details?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = "[" + timestamp + "] [" + level.toUpperCase() + "]";

  if (details === undefined) {
    console.log(prefix + " " + message);
    return;
  }

  console.log(prefix + " " + message, details);
}

export const logger = {
  configure(level: LogLevel): void {
    configuredLevel = level;
  },

  debug(message: string, details?: unknown): void {
    if (shouldLog(configuredLevel, "debug")) write("debug", message, details);
  },

  info(message: string, details?: unknown): void {
    if (shouldLog(configuredLevel, "info")) write("info", message, details);
  },

  warn(message: string, details?: unknown): void {
    if (shouldLog(configuredLevel, "warn")) write("warn", message, details);
  },

  error(message: string, details?: unknown): void {
    if (shouldLog(configuredLevel, "error")) write("error", message, details);
  },

  fatal(error: unknown): void {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    write("error", message);
  }
};
