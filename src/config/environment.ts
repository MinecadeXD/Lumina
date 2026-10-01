import 'dotenv/config';
import { defaults, logLevels } from './defaults.ts';
import { ConfigurationError } from '../utils/errors.ts';

export interface EnvironmentConfig {
  nodeEnv: string;
  logLevel: (typeof defaults.logLevels)[number];
  discordToken: string;
  discordClientId: string;
  discordGuildId?: string;
}

function requireValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ConfigurationError(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function loadEnvironment(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV?.trim() || defaults.nodeEnv;
  const rawLogLevel = process.env.LOG_LEVEL?.trim() || defaults.logLevel;

  if (!logLevels.includes(rawLogLevel as (typeof defaults.logLevels)[number])) {
    throw new ConfigurationError(
      `Invalid LOG_LEVEL "${rawLogLevel}". Expected one of: ${logLevels.join(', ')}`,
    );
  }

  const discordToken = requireValue('DISCORD_TOKEN');
  const discordClientId = requireValue('DISCORD_CLIENT_ID');
  const discordGuildId = process.env.DISCORD_GUILD_ID?.trim() || undefined;

  return {
    nodeEnv,
    logLevel: rawLogLevel as (typeof defaults.logLevels)[number],
    discordToken,
    discordClientId,
    discordGuildId,
  };
}