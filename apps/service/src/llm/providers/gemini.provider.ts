import { EAiCoachMessageRole } from '@app/common';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { ChatMessage, ImagePart, LlmProvider } from './llm-provider.interface';

@Injectable()
export class GeminiProvider implements LlmProvider {
  private readonly genAI: GoogleGenerativeAI;
  private readonly config = this.configService.llmConfig;

  constructor(private readonly configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(this.config.geminiApiKey);
  }

  async *stream(messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<string> {
    const systemMessages = messages.filter((m) => m.role === EAiCoachMessageRole.SYSTEM);
    const chatMessages = messages.filter((m) => m.role !== EAiCoachMessageRole.SYSTEM);

    const systemInstruction =
      systemMessages.length > 0 ? systemMessages.map((m) => m.content).join('\n\n') : undefined;

    const model = this.genAI.getGenerativeModel({
      model: this.config.geminiModel,
      ...(systemInstruction ? { systemInstruction } : {}),
    });

    // Convert history (all messages except the last user message) into Gemini format.
    const lastMessage = chatMessages[chatMessages.length - 1];
    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === EAiCoachMessageRole.USER ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });

    const result = await chat.sendMessageStream(lastMessage?.content ?? '', { signal } as {
      signal?: AbortSignal;
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  async complete(prompt: string, images: ImagePart[] = []): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.config.geminiModel });

    const parts: Part[] = [
      ...images.map(
        (img): Part => ({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data.toString('base64'),
          },
        }),
      ),
      { text: prompt },
    ];

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
    });

    return result.response.text();
  }
}
