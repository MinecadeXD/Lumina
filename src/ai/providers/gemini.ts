import { AIProviderError } from '../errors.ts';
import type { AIProvider, AIRequest, AIResponse } from '../provider.ts';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';

  public constructor(private readonly apiKey?: string) {}

  public isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new AIProviderError(
        'Gemini API key is not configured.',
        'configuration',
        this.name,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? 30_000);

    try {
      const systemMessages = request.messages.filter((message) => message.role === 'system');
      const conversation = request.messages.filter((message) => message.role !== 'system');

      const contents = conversation.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

      const body = {
        ...(systemMessages.length
          ? { systemInstruction: { parts: systemMessages.map((message) => ({ text: message.content })) } }
          : {}),
        contents,
        generationConfig: {
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          ...(request.maxTokens === undefined ? {} : { maxOutputTokens: request.maxTokens }),
        },
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw normalizeHttpError(response.status, data);
      }

      const gemini = data as GeminiResponse;
      const content = gemini.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('');

      if (!content) {
        throw new AIProviderError(
          'Gemini returned an empty response.',
          'provider_error',
          this.name,
        );
      }

      return {
        content,
        model: request.model,
        provider: this.name,
        ...(gemini.candidates?.[0]?.finishReason
          ? { finishReason: gemini.candidates[0].finishReason }
          : {}),
        ...(gemini.usageMetadata
          ? {
              usage: {
                promptTokens: gemini.usageMetadata.promptTokenCount,
                completionTokens: gemini.usageMetadata.candidatesTokenCount,
                totalTokens: gemini.usageMetadata.totalTokenCount,
              },
            }
          : {}),
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AIProviderError(
          'Gemini request timed out.',
          'timeout',
          this.name,
          error,
        );
      }

      throw new AIProviderError(
        'Gemini request failed.',
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

function normalizeHttpError(status: number, body: unknown): AIProviderError {
  if (status === 400) {
    return new AIProviderError('Gemini rejected the request.', 'invalid_request', 'gemini');
  }
  if (status === 401 || status === 403) {
    return new AIProviderError('Gemini authentication failed.', 'authentication', 'gemini');
  }
  if (status === 429) {
    return new AIProviderError('Gemini rate limit reached.', 'rate_limit', 'gemini');
  }
  return new AIProviderError(
    `Gemini returned HTTP ${status}.`,
    status >= 500 ? 'unavailable' : 'provider_error',
    'gemini',
  );
}
