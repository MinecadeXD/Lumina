import 'dotenv/config';
import { defaults, logLevels, type LogLevel } from './defaults.ts';
import { ConfigurationError } from '../utils/errors.ts';

export type AIProviderName = 'gemini' | 'groq' | 'openrouter';
export type MemoryBehavior = 'conservative' | 'off';

export interface EnvironmentConfig {
  nodeEnv: string;
  logLevel: LogLevel;
  discordToken: string;
  discordClientId: string;
  discordGuildId: string;
  primaryAIProvider: AIProviderName;
  fallbackAIProviders: AIProviderName[];
  aiModels: Record<AIProviderName, string>;
  aiTimeoutMs: number;
  aiMaxOutputTokens: number;
  conversationInactivityMs: number;
  contextMaxTokens: number;
  contextRecentMessages: number;
  contextMaxSummaryTokens: number;
  summaryTriggerMessages: number;
  summarySourceMessages: number;
  summaryRecentMessagesToKeep: number;
  summaryMaxTokens: number;
  luminaPersonality: string;
  aiChannelId?: string;
  aiChannelOnly: boolean;
  aiRoleId?: string;
  memoryBehavior: MemoryBehavior;
  rateUserRequests: number;
  rateProviderRequests: number;
  rateWindowMs: number;
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
  if (value === 'gemini' || value === 'groq' || value === 'openrouter') {
    return value;
  }

  throw new ConfigurationError(
    `Invalid ${name} "${value}". Expected gemini, groq, or openrouter.`,
  );
}

function parseProviders(
  value: string | undefined,
  name: string,
): AIProviderName[] {
  if (!value?.trim()) return [];

  return value
    .split(',')
    .map((provider) => parseProvider(provider.trim(), name));
}

function parseBoolean(
  value: string | undefined,
  name: string,
  fallback: boolean,
): boolean {
  if (!value?.trim()) return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  throw new ConfigurationError(`${name} must be true or false.`);
}

function parsePositiveInteger(
  value: string | undefined,
  name: string,
  fallback: number,
): number {
  if (!value?.trim()) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ConfigurationError(`${name} must be a positive integer.`);
  }

  return parsed;
}

function parseMemoryBehavior(value: string | undefined): MemoryBehavior {
  const normalized = value?.trim() || 'conservative';

  if (normalized === 'conservative' || normalized === 'off') {
    return normalized;
  }

  throw new ConfigurationError(
    'MEMORY_BEHAVIOR must be conservative or off.',
  );
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
  const discordGuildId = requireValue('DISCORD_GUILD_ID');

  const primaryAIProvider = parseProvider(
    process.env.PRIMARY_AI_PROVIDER?.trim() || 'gemini',
    'PRIMARY_AI_PROVIDER',
  );
  const fallbackAIProviders = parseProviders(
    process.env.FALLBACK_AI_PROVIDERS,
    'FALLBACK_AI_PROVIDERS',
  );

  if (
    new Set(fallbackAIProviders).size !== fallbackAIProviders.length
  ) {
    throw new ConfigurationError(
      'FALLBACK_AI_PROVIDERS contains duplicate providers.',
    );
  }

  if (fallbackAIProviders.includes(primaryAIProvider)) {
    throw new ConfigurationError(
      'PRIMARY_AI_PROVIDER must not also appear in FALLBACK_AI_PROVIDERS.',
    );
  }

  const aiChannelId = process.env.AI_CHANNEL_ID?.trim();
  const aiChannelOnly = parseBoolean(
    process.env.AI_CHANNEL_ONLY,
    'AI_CHANNEL_ONLY',
    false,
  );

  if (aiChannelOnly && !aiChannelId) {
    throw new ConfigurationError(
      'AI_CHANNEL_ID is required when AI_CHANNEL_ONLY is true.',
    );
  }

  const aiRoleId = process.env.AI_ROLE_ID?.trim();
  const memoryBehavior = parseMemoryBehavior(process.env.MEMORY_BEHAVIOR);

  const rateUserRequests = parsePositiveInteger(
    process.env.RATE_USER_REQUESTS,
    'RATE_USER_REQUESTS',
    10,
  );
  const rateProviderRequests = parsePositiveInteger(
    process.env.RATE_PROVIDER_REQUESTS,
    'RATE_PROVIDER_REQUESTS',
    60,
  );
  const rateWindowMs =
    parsePositiveInteger(
      process.env.RATE_WINDOW_SECONDS,
      'RATE_WINDOW_SECONDS',
      3600,
    ) * 1000;

  const environment: EnvironmentConfig = {
    nodeEnv,
    logLevel: rawLogLevel as LogLevel,
    discordToken,
    discordClientId,
    discordGuildId,
    primaryAIProvider,
    fallbackAIProviders,
    aiModels: {
      gemini: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
      groq: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b',
      openrouter:
        process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-oss-120b:free',
    },
    aiTimeoutMs: parsePositiveInteger(
      process.env.AI_TIMEOUT_MS,
      'AI_TIMEOUT_MS',
      30000,
    ),
    aiMaxOutputTokens: parsePositiveInteger(
      process.env.AI_MAX_OUTPUT_TOKENS,
      'AI_MAX_OUTPUT_TOKENS',
      450,
    ),
    contextMaxTokens: parsePositiveInteger(
      process.env.CONTEXT_MAX_TOKENS,
      'CONTEXT_MAX_TOKENS',
      6000,
    ),
    contextRecentMessages: parsePositiveInteger(
      process.env.CONTEXT_RECENT_MESSAGES,
      'CONTEXT_RECENT_MESSAGES',
      20,
    ),
    contextMaxSummaryTokens: parsePositiveInteger(
      process.env.CONTEXT_MAX_SUMMARY_TOKENS,
      'CONTEXT_MAX_SUMMARY_TOKENS',
      1000,
    ),
    summaryTriggerMessages: parsePositiveInteger(
      process.env.SUMMARY_TRIGGER_MESSAGES,
      'SUMMARY_TRIGGER_MESSAGES',
      30,
    ),
    summarySourceMessages: parsePositiveInteger(
      process.env.SUMMARY_SOURCE_MESSAGES,
      'SUMMARY_SOURCE_MESSAGES',
      60,
    ),
    summaryRecentMessagesToKeep: parsePositiveInteger(
      process.env.SUMMARY_RECENT_MESSAGES_TO_KEEP,
      'SUMMARY_RECENT_MESSAGES_TO_KEEP',
      12,
    ),
    summaryMaxTokens: parsePositiveInteger(
      process.env.SUMMARY_MAX_TOKENS,
      'SUMMARY_MAX_TOKENS',
      700,
    ),
    conversationInactivityMs:
      parsePositiveInteger(
        process.env.CONVERSATION_INACTIVITY_HOURS,
        'CONVERSATION_INACTIVITY_HOURS',
        24,
      ) *
      60 *
      60 *
      1000,
    luminaPersonality:
      process.env.LUMINA_PERSONALITY?.trim() || defaults.luminaPersonality,
    aiChannelOnly,
    memoryBehavior,
    rateUserRequests,
    rateProviderRequests,
    rateWindowMs,
  };

  if (aiChannelId) environment.aiChannelId = aiChannelId;
  if (aiRoleId) environment.aiRoleId = aiRoleId;

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const openrouterApiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (geminiApiKey) environment.geminiApiKey = geminiApiKey;
  if (groqApiKey) environment.groqApiKey = groqApiKey;
  if (openrouterApiKey) environment.openrouterApiKey = openrouterApiKey;

  return environment;
}
