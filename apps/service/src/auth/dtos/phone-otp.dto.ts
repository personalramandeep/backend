import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '+919876543210', description: 'Phone number in E.164 format' })
  phone: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '+919876543210', description: 'Phone number in E.164 format' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @ApiProperty({ example: '123456', description: '6-digit OTP' })
  otp: string;

  @IsOptional()
  @IsString()
  @Length(6, 12)
  @ApiProperty({ required: false })
  referralCode?: string;
}
