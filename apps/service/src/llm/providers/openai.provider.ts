import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '../../config/config.service';
import { ChatMessage, ImagePart, LlmProvider } from './llm-provider.interface';

@Injectable()
export class OpenAIProvider implements LlmProvider {
  private client: OpenAI;
  private readonly config = this.configService.llmConfig;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({ apiKey: this.config.openaiApiKey });
  }

  async *stream(messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create(
      {
        model: this.config.openaiModel,
        messages,
        stream: true,
      },
      { signal },
    );

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0].delta?.content) {
        yield chunk.choices[0].delta.content;
      }
    }
  }

  // TODO: wire OpenAI vision here
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async complete(prompt: string, _images: ImagePart[] = []): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.openaiModel,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0]?.message?.content ?? '';
  }
}
