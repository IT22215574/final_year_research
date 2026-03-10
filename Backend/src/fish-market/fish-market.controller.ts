import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { FishMarketService } from './fish-market.service';
import { CreateFishMarketEntryDto } from './dto/create-fish-market-entry.dto';
import { UpdateFishMarketEntryDto } from './dto/update-fish-market-entry.dto';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { fishMarketMulterOptions } from '../common/config/multer.config';

@Controller('admin/fish-market')
@UseGuards(AuthTokenGuard, AdminGuard)
export class FishMarketController {
  constructor(private readonly service: FishMarketService) {}

  // POST /api/v1/admin/fish-market
  @Post()
  @UseInterceptors(FilesInterceptor('images', 10, fishMarketMulterOptions))
  create(
    @Body() dto: CreateFishMarketEntryDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.service.create(dto, files ?? []);
  }

  // GET /api/v1/admin/fish-market?date=YYYY-MM-DD&from=...&to=...&categoryId=...
  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.findAll({ date, from, to, categoryId });
  }

  // GET /api/v1/admin/fish-market/dates
  @Get('dates')
  getAvailableDates() {
    return this.service.getAvailableDates();
  }

  // GET /api/v1/admin/fish-market/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // PATCH /api/v1/admin/fish-market/:id?replaceImages=true
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 10, fishMarketMulterOptions))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFishMarketEntryDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Query('replaceImages') replaceImages?: string,
  ) {
    return this.service.update(id, dto, files ?? [], replaceImages === 'true');
  }

  // DELETE /api/v1/admin/fish-market/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
