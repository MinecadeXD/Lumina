import { AIProviderError } from './errors.ts';
import type { AIProvider, AIRequest, AIResponse } from './provider.ts';

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
    let lastError: unknown;

    for (const name of names) {
      if (attempted.has(name)) continue;
      attempted.add(name);

      const provider = this.providers.get(name);
      if (!provider || !provider.isAvailable()) continue;

      try {
        return await provider.generate(request);
      } catch (error) {
        lastError = error;

        if (!(error instanceof AIProviderError) ||
            !['rate_limit', 'timeout', 'unavailable'].includes(error.code)) {
          throw error;
        }
      }
    }

    if (lastError instanceof Error) throw lastError;

    throw new AIProviderError(
      'No configured AI provider is available.',
      'unavailable',
      'router',
    );
  }
}
