import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Delete,
} from '@nestjs/common';
import { BoatService } from './boat.service';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { Types } from 'mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import { boatMulterOptions } from '../common/config/multer.config';

import { CreateBoatDto } from './dto/create-boat.dto';

@Controller('boats')
@UseGuards(AuthTokenGuard)
export class BoatController {
  constructor(private readonly boatService: BoatService) {}

  // ✅ Create boat (supports image upload)
  @Post()
  @UseInterceptors(FileInterceptor('boatImage', boatMulterOptions))
  async create(
    @Req() req: any,
    @Body() body: CreateBoatDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = this.getUserId(req);

    const boatImage = file ? `/uploads/boats/${file.filename}` : undefined;

    return this.boatService.create({
      ...body,
      userId,
      boatImage,
    } as any);
  }

  // ✅ IMPORTANT: put /my BEFORE /:id
  @Get('my')
  async myBoats(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.boatService.findMyBoats(userId);
  }

  @Get('types')
  getBoatTypes() {
    return this.boatService.getBoatTypes();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid boat id');
    }
    return this.boatService.findById(id);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid boat id');
    }

    return this.boatService.deleteBoat(id, userId);
  }

  private getUserId(req: any): string {
    const u = req.user;
    const userId = u?.id || u?._id || u?.userId || u?.sub;

    if (!userId) {
      throw new BadRequestException(
        'User not found in token (req.user missing)',
      );
    }

    return String(userId);
  }
}