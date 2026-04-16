import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiProperty({ description: 'UUID of the price to purchase' })
  @IsString()
  @IsNotEmpty()
  priceId: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Our internal PaymentOrder ID (returned from checkout)' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: "Provider's payment ID (from Razorpay SDK callback)" })
  @IsString()
  @IsNotEmpty()
  providerPaymentId: string;

  @ApiProperty({ description: "HMAC signature from Razorpay SDK callback" })
  @IsString()
  @IsNotEmpty()
  providerSignature: string;
}
