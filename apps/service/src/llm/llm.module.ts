import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { GeminiProvider } from './providers/gemini.provider';
import { LLM_PROVIDER } from './providers/llm-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    OpenAIProvider,
    GeminiProvider,
    {
      provide: LLM_PROVIDER,
      useFactory: (
        configService: ConfigService,
        openai: OpenAIProvider,
        gemini: GeminiProvider,
      ) => {
        const { llmActiveProvider } = configService.llmConfig;
        return llmActiveProvider === 'gemini' ? gemini : openai;
      },
      inject: [ConfigService, OpenAIProvider, GeminiProvider],
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
