import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FavoriteFishService, FavoriteFishDto } from './favorite-fish.service';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';

type AuthedRequest = Request & { user?: { id?: string; _id?: string } };

/**
 * Route prefix: /fish-favorites
 * සම්පූර්ණ route set:
 *   GET    /api/v1/fish-favorites          → logged-in user ගේ favourites ගන්නවා
 *   POST   /api/v1/fish-favorites          → favourite එකක් add කරනවා
 *   DELETE /api/v1/fish-favorites/:fishId  → favourite එකක් remove කරනවා
 */
@Controller('fish-favorites')
@UseGuards(AuthTokenGuard)
export class FavoriteFishController {
  constructor(private readonly service: FavoriteFishService) {}

  private userId(req: AuthedRequest): string {
    return (req.user?.id || req.user?._id) as string;
  }

  @Get()
  async getAll(@Req() req: AuthedRequest) {
    const data = await this.service.getAll(this.userId(req));
    return { success: true, data };
  }

  @Post()
  async add(@Req() req: AuthedRequest, @Body() body: FavoriteFishDto) {
    const data = await this.service.add(this.userId(req), body);
    return { success: true, data };
  }

  @Delete(':fishId')
  async remove(
    @Req() req: AuthedRequest,
    @Param('fishId', ParseIntPipe) fishId: number,
  ) {
    const data = await this.service.remove(this.userId(req), fishId);
    return { success: true, data };
  }
}
