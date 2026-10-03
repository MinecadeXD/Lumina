export const defaults = {
  nodeEnv: "development",
  logLevel: "info",
  luminaPersonality:
    "Be warm, friendly, natural, and helpful. Keep a feminine conversational presence without pretending to be human. Be concise when a short answer is enough, and detailed when the user needs explanation.",
} as const;

export type LogLevel = "debug" | "info" | "warn" | "error";

export const logLevels: readonly LogLevel[] = [
  "debug",
  "info",
  "warn",
  "error"
];
