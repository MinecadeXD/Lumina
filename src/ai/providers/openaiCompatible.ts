import { AIProviderError } from '../errors.ts';
import type { AIProvider, AIRequest, AIResponse } from '../provider.ts';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export abstract class OpenAICompatibleProvider implements AIProvider {
  public abstract readonly name: string;

  protected abstract readonly apiKey: string | undefined;
  protected abstract readonly baseUrl: string;

  public isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new AIProviderError(
        `${this.name} API key is not configured.`,
        'configuration',
        this.name,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? 30_000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
        }),
        signal: controller.signal,
      });

      const body = await readJson(response);

      if (!response.ok) {
        throw normalizeHttpError(response.status, body, this.name);
      }

      const data = body as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;

      if (typeof content !== 'string') {
        throw new AIProviderError(
          'Provider returned an invalid response.',
          'provider_error',
          this.name,
        );
      }

      return {
        content,
        model: data.model ?? request.model,
        provider: this.name,
        ...(data.choices?.[0]?.finish_reason
          ? { finishReason: data.choices[0].finish_reason }
          : {}),
        ...(data.usage
          ? {
              usage: {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              },
            }
          : {}),
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AIProviderError(
          `${this.name} request timed out.`,
          'timeout',
          this.name,
          error,
        );
      }

      throw new AIProviderError(
        `${this.name} request failed.`,
        'unavailable',
        this.name,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function normalizeHttpError(
  status: number,
  body: unknown,
  provider: string,
): AIProviderError {
  const message = extractMessage(body);

  if (status === 401 || status === 403) {
    return new AIProviderError(
      `${provider} authentication failed.`,
      'authentication',
      provider,
    );
  }

  if (status === 429) {
    return new AIProviderError(
      `${provider} rate limit reached.`,
      'rate_limit',
      provider,
    );
  }

  if (status === 400 || status === 404) {
    return new AIProviderError(
      `${provider} rejected the request: ${message}`,
      'invalid_request',
      provider,
    );
  }

  return new AIProviderError(
    `${provider} returned HTTP ${status}.`,
    status >= 500 ? 'unavailable' : 'provider_error',
    provider,
  );
}

function extractMessage(body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }

  return 'The provider rejected the request.';
}
