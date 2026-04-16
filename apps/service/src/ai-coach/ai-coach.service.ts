import { EAiCoachMessageRole } from '@app/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';
import { ConfigService } from '../config/config.service';
import { ChatMessage, LLM_PROVIDER, LlmProvider } from '../llm/providers/llm-provider.interface';
import { AiCoachMessageDto } from './dtos/ai-coach-message.dto';
import { AiCoachRepository } from './repositories/ai-coach.repository';

@Injectable()
export class AiCoachService {
  private readonly logger = new Logger(AiCoachService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly repo: AiCoachRepository,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

  private getToneInstruction(): string {
    const toneInstructions: Record<string, string> = {
      motivational:
        'Be enthusiastic, energetic, and encouraging. Use bold, inspiring language that pushes athletes to exceed their limits.',
      professional:
        'Be calm, precise, and authoritative. Use clear, measured language grounded in sports science.',
      friendly:
        'Be warm, conversational, and supportive. Use approachable language as if coaching a friend.',
      angry:
        'Be intense, blunt, and no-nonsense. Use sharp, forceful language that calls out laziness and demands immediate effort, like a strict coach pushing for discipline.',
      humorous_roast:
        'Be witty, sarcastic, and playful. Use light-hearted roasting and humor to point out flaws while still keeping it fun and motivating, never crossing into genuinely offensive territory.',
    };

    const randomTone = _.sample(Object.keys(toneInstructions));

    const tone = randomTone || this.config.get('AI_COACH_ASSISTANT_TONE') || 'motivational';

    return toneInstructions[tone.toLowerCase()] ?? toneInstructions['motivational'];
  }

  private buildSystemPrompt(context?: string): string {
    const name = this.config.get('AI_COACH_ASSISTANT_NAME') || "Kreeda's AI Coach";
    const toneGuidance = this.getToneInstruction();

    let prompt = `You are ${name}, an expert sports performance assistant. \
Your goal is to help athletes improve their technique, strategy, and overall performance. \
Provide concise, actionable, and encouraging feedback. Base your guidance strictly on sports science and coaching best practices.

Tone: ${toneGuidance}`;

    if (context) {
      prompt += `\n\nContext provided by the user (e.g. video analysis metadata or previous notes):\n${context}`;
    }

    return prompt;
  }

  async streamResponse(
    userId: string,
    dto: AiCoachMessageDto,
    signal: AbortSignal,
    onToken: (t: string) => void,
  ): Promise<void> {
    const sessionTimeout = Number(this.config.get('AI_COACH_SESSION_TIMEOUT_MINUTES'));
    const contextMessagesCount = Number(this.config.get('AI_COACH_CONTEXT_MESSAGES'));

    const session = await this.repo.resolveSession(userId, sessionTimeout);
    const history = await this.repo.getSessionContext(session._id, contextMessagesCount);

    const messages: ChatMessage[] = [
      { role: EAiCoachMessageRole.SYSTEM, content: this.buildSystemPrompt(dto.context) },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: EAiCoachMessageRole.USER, content: dto.message },
    ];

    this.logger.debug(
      `LLM stream started: userId=${userId} sessionId=${session._id.toString()} messages=${JSON.stringify(messages)}`,
    );

    let fullReply = '';
    try {
      for await (const token of this.llmProvider.stream(messages, signal)) {
        fullReply += token;
        onToken(token);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        this.logger.log(
          `LLM stream aborted: userId=${userId} sessionId=${session._id.toString()} partialLength=${fullReply.length}`,
        );
      } else {
        this.logger.error(
          `LLM stream error: userId=${userId} sessionId=${session._id.toString()}`,
          err instanceof Error ? err.stack : err,
        );
      }
      throw err;
    } finally {
      // persist - even if aborted
      // fullReply could be a partial completion if aborted
      if (fullReply) {
        await this.repo.appendMessages(session._id, userId, dto.message, fullReply);
      }
    }
  }
}
