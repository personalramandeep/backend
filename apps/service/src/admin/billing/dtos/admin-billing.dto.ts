import { EBillingInterval, EFeatureValueType, EQuotaResetPeriod } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  sort_order?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  badge_label?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  trial_days?: number;
}

export class UpdatePlanDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  is_public?: boolean;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  sort_order?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  badge_label?: string;
}

export class UpsertPlanFeatureDto {
  @ApiProperty()
  @IsUUID()
  feature_id: string;

  @ApiProperty()
  @IsBoolean()
  is_enabled: boolean;

  @ApiProperty({ required: false, description: 'Null for boolean features, -1 for unlimited, >0 for quota' })
  @IsInt()
  @IsOptional()
  limit_value?: number;
}

export class CreateFeatureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: EFeatureValueType })
  @IsEnum(EFeatureValueType)
  value_type: EFeatureValueType;

  @ApiProperty({ required: false, description: 'Global tooltip shown next to the feature on pricing pages' })
  @IsString()
  @IsOptional()
  tooltip?: string;

  @ApiProperty({ required: false, description: 'Display order on pricing cards (lower = first)', default: 0 })
  @IsInt()
  @IsOptional()
  sort_order?: number;
}

export class UpdateFeatureDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ required: false, description: 'Global tooltip shown next to this feature on pricing pages' })
  @IsString()
  @IsOptional()
  tooltip?: string | null;

  @ApiProperty({ required: false, description: 'Display order on pricing cards (lower = first)' })
  @IsInt()
  @IsOptional()
  sort_order?: number;
}

export class UpdatePlanFeatureDto {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  is_enabled?: boolean;

  @ApiProperty({ required: false, description: 'Null for boolean features, -1 for unlimited, >0 for quota' })
  @IsInt()
  @IsOptional()
  limit_value?: number | null;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  display_label?: string | null;

  @ApiProperty({ required: false, description: 'Per-plan tooltip override. Overrides feature.tooltip if set.' })
  @IsString()
  @IsOptional()
  tooltip?: string | null;

  @ApiProperty({ required: false, enum: EQuotaResetPeriod })
  @IsEnum(EQuotaResetPeriod)
  @IsOptional()
  quota_reset_period?: string | null;
}

export class CreatePriceDto {
  @ApiProperty({ enum: EBillingInterval })
  @IsEnum(EBillingInterval)
  billing_interval: EBillingInterval;

  @ApiProperty()
  @IsInt()
  @Min(1)
  amount_minor_units: number;

  @ApiProperty({ required: false, default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  razorpay_plan_id?: string;
}

export class UpdatePriceDto {
  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  amount_minor_units?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
