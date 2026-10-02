import { OpenAICompatibleProvider } from './openaiCompatible.ts';

export class OpenRouterProvider extends OpenAICompatibleProvider {
  public readonly name = 'openrouter';
  protected readonly apiKey: string | undefined;
  protected readonly baseUrl = 'https://openrouter.ai/api/v1';

  public constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey;
  }
}
