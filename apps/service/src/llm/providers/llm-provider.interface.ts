import { EAiCoachMessageRole } from '@app/common';

export interface ChatMessage {
  role: EAiCoachMessageRole;
  content: string;
}

export interface ImagePart {
  mimeType: 'image/jpeg' | 'image/png';
  data: Buffer;
}

export interface LlmProvider {
  stream(messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<string>;
  complete(prompt: string, images?: ImagePart[]): Promise<string>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
