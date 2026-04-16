import { ERole } from '@app/common';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../authorization/decorators/roles.decorator';
import { AdminBillingService } from './admin-billing.service';
import {
  CreateFeatureDto,
  CreatePlanDto,
  CreatePriceDto,
  UpdateFeatureDto,
  UpdatePlanDto,
  UpdatePlanFeatureDto,
  UpdatePriceDto,
  UpsertPlanFeatureDto,
} from './dtos/admin-billing.dto';

@ApiTags('Admin Billing')
@ApiBearerAuth()
@Roles(ERole.ADMIN)
@Controller('/admin/billing')
export class AdminBillingController {
  constructor(private readonly adminBillingService: AdminBillingService) {}

  @Get('/products')
  @ApiOperation({ summary: 'List all products with plans' })
  async listProducts() {
    return this.adminBillingService.listProducts();
  }

  @Get('/plans')
  @ApiOperation({ summary: 'List all plans including inactive ones with features and prices' })
  async listPlans() {
    return this.adminBillingService.listPlans();
  }

  @Get('/features')
  @ApiOperation({ summary: 'List all feature definitions' })
  async listFeatures() {
    return this.adminBillingService.listFeatures();
  }

  @Post('/products/:productId/plans')
  @ApiOperation({ summary: 'Create a new plan under a product' })
  async createPlan(@Param('productId') productId: string, @Body() dto: CreatePlanDto) {
    return this.adminBillingService.createPlan(productId, dto);
  }

  @Patch('/plans/:id')
  @ApiOperation({ summary: 'Update plan fields' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.adminBillingService.updatePlan(id, dto);
  }

  @Post('/plans/:id/features')
  @ApiOperation({ summary: 'Upsert a feature for a plan' })
  async upsertPlanFeature(@Param('id') planId: string, @Body() dto: UpsertPlanFeatureDto) {
    return this.adminBillingService.upsertPlanFeature(planId, dto);
  }

  @Delete('/plans/:planId/features/:featureId')
  @ApiOperation({ summary: 'Remove a feature from a plan' })
  async removePlanFeature(@Param('planId') planId: string, @Param('featureId') featureId: string) {
    await this.adminBillingService.removePlanFeature(planId, featureId);
    return { success: true };
  }

  @Post('/features')
  @ApiOperation({ summary: 'Create a new feature definition' })
  async createFeature(@Body() dto: CreateFeatureDto) {
    return this.adminBillingService.createFeature(dto);
  }

  @Post('/plans/:id/prices')
  @ApiOperation({ summary: 'Add a price to a plan' })
  async createPrice(@Param('id') planId: string, @Body() dto: CreatePriceDto) {
    return this.adminBillingService.createPrice(planId, dto);
  }

  @Patch('/prices/:id')
  @ApiOperation({ summary: 'Update price' })
  async updatePrice(@Param('id') id: string, @Body() dto: UpdatePriceDto) {
    return this.adminBillingService.updatePrice(id, dto);
  }

  @Post('/seed')
  @ApiOperation({ summary: 'Run Billing Seeder' })
  async runSeeder() {
    return this.adminBillingService.runSeeder();
  }

  @Patch('/features/:id')
  @ApiOperation({ summary: 'Update a feature definition (label only, key is immutable)' })
  async updateFeature(@Param('id') id: string, @Body() dto: UpdateFeatureDto) {
    return this.adminBillingService.updateFeature(id, dto);
  }

  @Patch('/plans/:planId/features/:featureId')
  @ApiOperation({ summary: 'Update a plan-feature link (display_label, quota_reset_period, limit_value, is_enabled)' })
  async updatePlanFeature(
    @Param('planId') planId: string,
    @Param('featureId') featureId: string,
    @Body() dto: UpdatePlanFeatureDto,
  ) {
    return this.adminBillingService.updatePlanFeature(planId, featureId, dto);
  }

  @Delete('/prices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hard-delete a price entry' })
  async deletePrice(@Param('id') id: string) {
    await this.adminBillingService.deletePrice(id);
  }
}
