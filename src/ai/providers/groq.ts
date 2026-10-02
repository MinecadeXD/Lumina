import { OpenAICompatibleProvider } from './openaiCompatible.ts';

export class GroqProvider extends OpenAICompatibleProvider {
  public readonly name = 'groq';
  protected readonly apiKey: string | undefined;
  protected readonly baseUrl = 'https://api.groq.com/openai/v1';

  public constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey;
  }
}
