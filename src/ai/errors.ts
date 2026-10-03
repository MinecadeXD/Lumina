import { AppError } from '../utils/errors.ts';

export type AIErrorCode =
  | 'configuration'
  | 'authentication'
  | 'rate_limit'
  | 'timeout'
  | 'unavailable'
  | 'invalid_request'
  | 'provider_error';

export class AIProviderError extends AppError {
  public constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly provider: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

export function isRetryableAIError(error: unknown): error is AIProviderError {
  return error instanceof AIProviderError &&
    ['rate_limit', 'timeout', 'unavailable'].includes(error.code);
}
