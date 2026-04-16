import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PricingService } from './pricing.service';

@ApiTags('Pricing')
@Controller('/pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('/plans')
  @Public()
  @ApiOperation({ summary: 'Get all active public plans with features and prices' })
  async getPlans() {
    return this.pricingService.getAllActivePlans();
  }

  @Get('/plans/:slug')
  @Public()
  @ApiOperation({ summary: 'Get a single plan by slug' })
  async getPlanBySlug(@Param('slug') slug: string) {
    return this.pricingService.getPlanBySlug(slug);
  }
}
