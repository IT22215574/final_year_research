import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { CostPreferencesService } from './cost-preferences.service';
import { CreateCostPreferenceDto } from './dto/create-cost-preference.dto';
import { UpdateCostPreferenceDto } from './dto/update-cost-preference.dto';

@Controller('cost-preferences')
@UseGuards(AuthTokenGuard)
export class CostPreferencesController {
  constructor(
    private readonly costPreferencesService: CostPreferencesService,
  ) {}

  private getUserId(req: any): string {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    return userId;
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateCostPreferenceDto) {
    const userId = this.getUserId(req);
    return this.costPreferencesService.create(userId, dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.costPreferencesService.findAllForUser(userId);
  }

  @Get('active-auto-apply')
  async findActiveAutoApply(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.costPreferencesService.findActiveAutoApplyForUser(userId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.costPreferencesService.findOneForUser(userId, id);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCostPreferenceDto,
  ) {
    const userId = this.getUserId(req);
    return this.costPreferencesService.update(userId, id, dto);
  }

  @Patch(':id/toggle')
  async toggleActive(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.costPreferencesService.toggleActive(userId, id);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.costPreferencesService.remove(userId, id);
  }
}
