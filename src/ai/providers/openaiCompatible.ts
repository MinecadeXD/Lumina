import { AIProviderError } from '../errors.ts';
import { normalizeProviderContent } from '../responseNormalizer.ts';
import type { AIProvider, AIRequest, AIResponse } from '../provider.ts';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown }; finish_reason?: string | null }>;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export abstract class OpenAICompatibleProvider implements AIProvider {
  public abstract readonly name: string;
  protected abstract readonly apiKey: string | undefined;
  protected abstract readonly baseUrl: string;
  public isAvailable(): boolean { return Boolean(this.apiKey); }

  protected getRequestBody(request: AIRequest): Record<string, unknown> {
    return {
      model: request.model, messages: request.messages,
      ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
      ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
    };
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) throw new AIProviderError(`${this.name} API key is not configured.`, 'configuration', this.name);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? 30_000);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(this.getRequestBody(request)), signal: controller.signal,
      });
      const body = await readJson(response);
      if (!response.ok) throw normalizeHttpError(response.status, body, this.name);
      const data = body as ChatCompletionResponse;
      const content = normalizeProviderContent(data.choices?.[0]?.message?.content);
      if (!content) throw new AIProviderError('Provider returned an empty response.', 'provider_error', this.name);
      const rawUsage = data.usage;
      const usage = rawUsage ? {
        ...(rawUsage.prompt_tokens === undefined ? {} : { promptTokens: rawUsage.prompt_tokens }),
        ...(rawUsage.completion_tokens === undefined ? {} : { completionTokens: rawUsage.completion_tokens }),
        ...(rawUsage.total_tokens === undefined ? {} : { totalTokens: rawUsage.total_tokens }),
      } : undefined;
      return {
        content, model: data.model ?? request.model, provider: this.name,
        ...(data.choices?.[0]?.finish_reason ? { finishReason: data.choices[0].finish_reason } : {}),
        ...(usage && Object.keys(usage).length > 0 ? { usage } : {}),
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') throw new AIProviderError(`${this.name} request timed out.`, 'timeout', this.name, error);
      throw new AIProviderError(`${this.name} request failed.`, 'unavailable', this.name, error);
    } finally { clearTimeout(timeout); }
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text) as unknown; } catch { return { message: text }; }
}

function normalizeHttpError(status: number, body: unknown, provider: string): AIProviderError {
  const message = extractMessage(body);
  if (status === 401 || status === 403) return new AIProviderError(`${provider} authentication/permission failed: ${message}`, 'authentication', provider);
  if (status === 429) return new AIProviderError(`${provider} rate limit reached: ${message}`, 'rate_limit', provider);
  if (status === 400 || status === 404 || status === 413 || status === 422) return new AIProviderError(`${provider} rejected the request (HTTP ${status}): ${message}`, 'invalid_request', provider);
  return new AIProviderError(`${provider} returned HTTP ${status}: ${message}`, status >= 500 ? 'unavailable' : 'provider_error', provider);
}

function extractMessage(body: unknown): string {
  if (typeof body !== 'object' || body === null) return 'The provider returned no structured error details.';
  if ('error' in body && typeof body.error === 'object' && body.error !== null && 'message' in body.error && typeof body.error.message === 'string') return body.error.message;
  if ('message' in body && typeof body.message === 'string') return body.message;
  return 'The provider rejected the request.';
}