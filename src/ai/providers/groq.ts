import { OpenAICompatibleProvider } from './openaiCompatible.ts';
import type { AIRequest } from '../provider.ts';

export class GroqProvider extends OpenAICompatibleProvider {
  public readonly name = 'groq';
  protected readonly apiKey: string | undefined;
  protected readonly baseUrl = 'https://api.groq.com/openai/v1';

  public constructor(apiKey?: string) { super(); this.apiKey = apiKey; }

  protected override getRequestBody(request: AIRequest): Record<string, unknown> {
    return {
      ...super.getRequestBody(request),
      ...(request.model.startsWith('openai/gpt-oss-') ? { include_reasoning: false } : {}),
    };
  }
}