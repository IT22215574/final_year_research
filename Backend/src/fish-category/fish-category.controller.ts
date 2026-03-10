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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { FishCategoryService } from './fish-category.service';
import { CreateFishCategoryDto } from './dto/create-fish-category.dto';
import { UpdateFishCategoryDto } from './dto/update-fish-category.dto';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { AdminGuard } from '../common/guards/admin.guard';

// Public GET endpoints — no guard so mobile/web can read categories.
// Write operations (POST / PATCH / DELETE) are admin-only.
@Controller('fish-categories')
export class FishCategoryController {
  constructor(private readonly service: FishCategoryService) {}

  // GET /api/v1/fish-categories?search=
  @Get()
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  // GET /api/v1/fish-categories/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // POST /api/v1/fish-categories  (admin)
  @Post()
  @UseGuards(AuthTokenGuard, AdminGuard)
  create(@Body() dto: CreateFishCategoryDto) {
    return this.service.create(dto);
  }

  // PATCH /api/v1/fish-categories/:id  (admin)
  @Patch(':id')
  @UseGuards(AuthTokenGuard, AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateFishCategoryDto) {
    return this.service.update(id, dto);
  }

  // DELETE /api/v1/fish-categories/:id  (admin)
  @Delete(':id')
  @UseGuards(AuthTokenGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
