import { Controller, Post, Get, Param, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { BoatService } from './boat.service';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { Types } from 'mongoose';

@Controller('boats')
@UseGuards(AuthTokenGuard) // ✅ same pattern as MlController
export class BoatController {
  constructor(private readonly boatService: BoatService) {}

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    // ✅ get userId from token (AuthTokenGuard should attach req.user)
    const userId = this.getUserId(req);

    // ✅ force userId from token, ignore any body.userId to prevent cheating
    return this.boatService.create({
      ...body,
      userId,
    });
  }

  // ✅ IMPORTANT: put /my BEFORE /:id to avoid "my" being treated as id
  @Get('my')
  async myBoats(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.boatService.findMyBoats(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // ✅ prevent CastError -> return 400 instead of 500
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid boat id');
    }
    return this.boatService.findById(id);
  }

  // helper: because different guards attach different shapes
  private getUserId(req: any): string {
    const u = req.user;

    // try common patterns
    const userId = u?.id || u?._id || u?.userId || u?.sub;

    if (!userId) {
      // If this triggers, it means AuthTokenGuard didn't set req.user correctly
      throw new BadRequestException('User not found in token (req.user missing)');
    }

    return String(userId);
  }
}