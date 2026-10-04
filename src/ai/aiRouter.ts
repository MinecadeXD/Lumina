import { AIProviderError, isRetryableAIError } from './errors.ts';
import type { AIProvider, AIRequest, AIResponse } from './provider.ts';
import { logger } from '../logging/logger.ts';

export interface AIRouterOptions {
  primary: string;
  fallbacks?: readonly string[];
  models?: Readonly<Record<string, string>>;
}

export interface AIRouterGenerateOptions {
  preferredProvider?: string;
  preferredModel?: string;
  isProviderAllowed?: (provider: string) => boolean;
  onProviderRequest?: (provider: string) => void;
}

export class AIRouter {
  private readonly providers = new Map<string, AIProvider>();
  public constructor(private readonly options: AIRouterOptions) {}
  public register(provider: AIProvider): void { this.providers.set(provider.name, provider); }
  public getProvider(name: string): AIProvider | undefined { return this.providers.get(name); }
  public availableProviders(): string[] { return [...this.providers.values()].filter((p) => p.isAvailable()).map((p) => p.name); }

  public async generate(request: AIRequest, overrides: AIRouterGenerateOptions = {}): Promise<AIResponse> {
    const primary = overrides.preferredProvider ?? this.options.primary;
    const fallbackNames = overrides.preferredProvider ? (this.options.fallbacks ?? []).filter((name) => name !== primary) : (this.options.fallbacks ?? []);
    const names = [primary, ...fallbackNames];
    const attempted = new Set<string>();
    let lastRetryableError: AIProviderError | undefined;

    for (const name of names) {
      if (attempted.has(name)) continue;
      attempted.add(name);
      if (overrides.isProviderAllowed && !overrides.isProviderAllowed(name)) { logger.debug('Skipping rate-limited provider: ' + name); continue; }
      const provider = this.providers.get(name);
      if (!provider) throw new AIProviderError('Configured AI provider "' + name + '" is not registered.', 'configuration', name);
      if (!provider.isAvailable()) {
        if (name === primary) throw new AIProviderError(name + ' API credentials are not configured.', 'configuration', name);
        logger.debug('Skipping unavailable fallback provider: ' + name); continue;
      }
      const model = name === primary && overrides.preferredModel ? overrides.preferredModel : this.options.models?.[name] ?? request.model;
      if (!model) throw new AIProviderError('No model is configured for AI provider "' + name + '".', 'configuration', name);
      try {
        overrides.onProviderRequest?.(name);
        return await provider.generate({ ...request, model });
      } catch (error) {
        if (!isRetryableAIError(error)) throw error;
        lastRetryableError = error;
        logger.warn('AI provider "' + name + '" failed with a retryable error (' + error.code + '); trying the next configured provider.');
      }
    }
    if (lastRetryableError) throw new AIProviderError('All configured AI providers failed with temporary or unavailable errors.', lastRetryableError.code, 'router', lastRetryableError);
    throw new AIProviderError('No configured AI provider is available.', 'unavailable', 'router');
  }
}