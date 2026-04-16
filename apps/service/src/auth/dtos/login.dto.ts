import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  idToken: string;

  @IsOptional()
  @IsString()
  @Length(6, 12)
  @ApiProperty({ required: false })
  referralCode?: string;
}
