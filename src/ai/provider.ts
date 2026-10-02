export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: readonly AIMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  readonly name: string;
  isAvailable(): boolean;
  generate(request: AIRequest): Promise<AIResponse>;
}
