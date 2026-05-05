import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Delete,
  ForbiddenException,
} from '@nestjs/common';
import { BoatService } from './boat.service';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { Types } from 'mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import { boatMulterOptions } from '../common/config/multer.config';
import { UserService } from '../user/user.service';

import { CreateBoatDto } from './dto/create-boat.dto';

@Controller('boats')
@UseGuards(AuthTokenGuard)
export class BoatController {
  constructor(
    private readonly boatService: BoatService,
    private readonly userService: UserService,
  ) {}

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

  @Get('admin/types')
  async getAdminBoatTypes(@Req() req: any) {
    await this.ensureAdmin(req);
    return this.boatService.getAdminBoatTypes();
  }

  @Get('admin/all')
  async getAllBoatsForAdmin(@Req() req: any) {
    await this.ensureAdmin(req);
    return this.boatService.findAllBoats();
  }

  @Post('admin/types')
  async createAdminBoatType(
    @Req() req: any,
    @Body() body: { name?: string; description?: string; fuelPerKm?: number },
  ) {
    const adminId = this.getUserId(req);
    await this.ensureAdmin(req);
    return this.boatService.createAdminBoatType(body, adminId);
  }

  @Patch('admin/types/:id')
  async updateAdminBoatType(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      fuelPerKm?: number;
      active?: boolean;
    },
  ) {
    const adminId = this.getUserId(req);
    await this.ensureAdmin(req);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid boat type id');
    }

    return this.boatService.updateAdminBoatType(id, body, adminId);
  }

  @Delete('admin/types/:id')
  async deleteAdminBoatType(@Req() req: any, @Param('id') id: string) {
    await this.ensureAdmin(req);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid boat type id');
    }

    return this.boatService.deleteAdminBoatType(id);
  }

  @Get('fuel-baselines')
  getFuelBaselines() {
    return this.boatService.getFuelBaselines();
  }

  @Get('types-with-fuel-info')
  getBoatTypesWithFuelInfo() {
    return this.boatService.getBoatTypesWithFuelInfo();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid boat id');
    }
    return this.boatService.findById(id);
  }

  // ✅ Update boat (supports image upload)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('boatImage', boatMulterOptions))
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = this.getUserId(req);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid boat id');
    }

    const boatImage = file ? `/uploads/boats/${file.filename}` : undefined;

    return this.boatService.updateBoat(id, userId, {
      ...body,
      ...(boatImage && { boatImage }),
    });
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid boat id');
    }

    return this.boatService.deleteBoat(id, userId);
  }

  // Get boat learning insights and adaptive coefficients
  @Get(':id/learning-insights')
  async getLearningInsights(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid boat id');
    }

    return this.boatService.getBoatLearningInsights(id, userId);
  }

  // Get boat prediction history for analysis
  @Get(':id/prediction-history')
  async getPredictionHistory(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid boat id');
    }

    return this.boatService.getBoatPredictionHistory(id, userId);
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

  private isAdminLikeUser(user: any): boolean {
    const role = String(user?.role || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    return (
      user?.isAdmin === true ||
      String(user?.isAdmin).toLowerCase() === 'true' ||
      role.includes('admin')
    );
  }

  private async ensureAdmin(req: any): Promise<void> {
    const user = req?.user ?? {};

    if (this.isAdminLikeUser(user)) {
      return;
    }

    const userId = this.getUserId(req);
    const latestUser = await this.userService
      .getUserById(userId)
      .catch(() => null);

    if (!latestUser || !this.isAdminLikeUser(latestUser)) {
      throw new ForbiddenException('Only fish admin can manage boat types');
    }
  }
}
