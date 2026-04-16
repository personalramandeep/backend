import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AiCoachMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  context?: string;
}
