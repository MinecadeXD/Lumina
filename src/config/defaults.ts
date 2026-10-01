export const defaults = {
  nodeEnv: "development",
  logLevel: "info"
} as const;

export type LogLevel = "debug" | "info" | "warn" | "error";

export const logLevels: readonly LogLevel[] = [
  "debug",
  "info",
  "warn",
  "error"
];
