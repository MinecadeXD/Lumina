import 'dotenv/config';
import { defaults, logLevels, type LogLevel } from './defaults.ts';
import { ConfigurationError } from '../utils/errors.ts';

export type AIProviderName = 'gemini' | 'groq' | 'openrouter';

export interface EnvironmentConfig {
  nodeEnv: string;
  logLevel: LogLevel;
  discordToken: string;
  discordClientId: string;
  discordGuildId?: string;
  primaryAIProvider: AIProviderName;
  fallbackAIProviders: AIProviderName[];
  aiModels: Record<AIProviderName, string>;
  aiTimeoutMs: number;
  geminiApiKey?: string;
  groqApiKey?: string;
  openrouterApiKey?: string;
}

function requireValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ConfigurationError(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseProvider(value: string, name: string): AIProviderName {
  if (value === 'gemini' || value === 'groq' || value === 'openrouter') return value;
  throw new ConfigurationError(
    `Invalid ${name} "${value}". Expected gemini, groq, or openrouter.`,
  );
}

function parseProviders(value: string | undefined, name: string): AIProviderName[] {
  if (!value?.trim()) return [];
  return value.split(',').map((provider) => parseProvider(provider.trim(), name));
}

function parsePositiveInteger(value: string | undefined, name: string, fallback: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ConfigurationError(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function loadEnvironment(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV?.trim() || defaults.nodeEnv;
  const rawLogLevel = process.env.LOG_LEVEL?.trim() || defaults.logLevel;

  if (!logLevels.includes(rawLogLevel as LogLevel)) {
    throw new ConfigurationError(
      `Invalid LOG_LEVEL "${rawLogLevel}". Expected one of: ${logLevels.join(', ')}`,
    );
  }

  const discordToken = requireValue('DISCORD_TOKEN');
  const discordClientId = requireValue('DISCORD_CLIENT_ID');
  const discordGuildId = process.env.DISCORD_GUILD_ID?.trim();

  const primaryAIProvider = parseProvider(
    process.env.PRIMARY_AI_PROVIDER?.trim() || 'gemini',
    'PRIMARY_AI_PROVIDER',
  );
  const fallbackAIProviders = parseProviders(
    process.env.FALLBACK_AI_PROVIDERS,
    'FALLBACK_AI_PROVIDERS',
  );

  const environment: EnvironmentConfig = {
    nodeEnv,
    logLevel: rawLogLevel as LogLevel,
    discordToken,
    discordClientId,
    primaryAIProvider,
    fallbackAIProviders,
    aiModels: {
      gemini: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
      groq: process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile',
      openrouter: process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-oss-120b:free',
    },
    aiTimeoutMs: parsePositiveInteger(process.env.AI_TIMEOUT_MS, 'AI_TIMEOUT_MS', 30_000),
  };

  if (discordGuildId) environment.discordGuildId = discordGuildId;

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const openrouterApiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (geminiApiKey) environment.geminiApiKey = geminiApiKey;
  if (groqApiKey) environment.groqApiKey = groqApiKey;
  if (openrouterApiKey) environment.openrouterApiKey = openrouterApiKey;

  return environment;
}
