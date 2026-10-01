import "dotenv/config";
import { defaults, logLevels, type LogLevel } from "./defaults.js";
import { ConfigurationError } from "../utils/errors.js";

export interface EnvironmentConfig {
  readonly nodeEnv: string;
  readonly logLevel: LogLevel;
}

function readLogLevel(value: string | undefined): LogLevel {
  const candidate = value ?? defaults.logLevel;

  if (!logLevels.includes(candidate as LogLevel)) {
    throw new ConfigurationError(
      `Invalid LOG_LEVEL "${candidate}". Expected one of: ${logLevels.join(", ")}.`
    );
  }

  return candidate as LogLevel;
}

export function loadEnvironment(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV?.trim() || defaults.nodeEnv;

  return {
    nodeEnv,
    logLevel: readLogLevel(process.env.LOG_LEVEL)
  };
}
