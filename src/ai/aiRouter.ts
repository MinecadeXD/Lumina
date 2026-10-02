import { AIProviderError, isRetryableAIError } from './errors.ts';
import type { AIProvider, AIRequest, AIResponse } from './provider.ts';
import { logger } from '../logging/logger.ts';

export interface AIRouterOptions {
  primary: string;
  fallbacks?: readonly string[];
}

export class AIRouter {
  private readonly providers = new Map<string, AIProvider>();

  public constructor(private readonly options: AIRouterOptions) {}

  public register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  public availableProviders(): string[] {
    return [...this.providers.values()]
      .filter((provider) => provider.isAvailable())
      .map((provider) => provider.name);
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    const names = [this.options.primary, ...(this.options.fallbacks ?? [])];
    const attempted = new Set<string>();
    let lastRetryableError: AIProviderError | undefined;

    for (const name of names) {
      if (attempted.has(name)) continue;
      attempted.add(name);

      const provider = this.providers.get(name);

      if (!provider) {
        const error = new AIProviderError(
          `Configured AI provider "${name}" is not registered.`,
          'configuration',
          name,
        );

        // A missing provider is a permanent configuration problem. Never
        // hide it by silently continuing to another provider.
        throw error;
      }

      // Missing credentials are a configuration problem. For the primary
      // provider, surface it immediately. For an explicitly configured
      // fallback, skip it so later valid fallbacks can still be used.
      if (!provider.isAvailable()) {
        if (name === this.options.primary) {
          throw new AIProviderError(
            `${name} API credentials are not configured.`,
            'configuration',
            name,
          );
        }

        logger.debug(`Skipping unavailable fallback provider: ${name}`);
        continue;
      }

      try {
        return await provider.generate(request);
      } catch (error) {
        if (!isRetryableAIError(error)) {
          // Authentication, invalid requests, invalid model configuration,
          // and other permanent provider errors must remain visible.
          throw error;
        }

        lastRetryableError = error;
        logger.warn(
          `AI provider "${name}" failed with a retryable error (${error.code}); trying the next configured provider.`,
        );
      }
    }

    if (lastRetryableError) {
      throw new AIProviderError(
        'All configured AI providers failed with temporary or unavailable errors.',
        lastRetryableError.code,
        'router',
        lastRetryableError,
      );
    }

    throw new AIProviderError(
      'No configured AI provider is available.',
      'unavailable',
      'router',
    );
  }
}
