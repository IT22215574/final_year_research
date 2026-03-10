import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';

import { GradingRecordsService } from './grading-records.service';
import { CreateGradingRecordDto } from './dto/create-grading-record.dto';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { gradingRecordMulterOptions } from '../common/config/multer.config';

@Controller('quality-grading-records')
@UseGuards(AuthTokenGuard)
export class GradingRecordsController {
  constructor(private readonly service: GradingRecordsService) {}

  // POST /api/v1/quality-grading-records
  @Post()
  @UseInterceptors(FilesInterceptor('images', 2, gradingRecordMulterOptions))
  create(
    @Req() req: Request,
    @Body() dto: CreateGradingRecordDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    const u = (req as any).user;
    const userId = u?.userId || u?.id || u?.sub || u?._id;
    return this.service.create(userId, dto, files ?? []);
  }

  // GET /api/v1/quality-grading-records/my-history?limit=20&skip=0
  @Get('my-history')
  findMyHistory(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const u = (req as any).user;
    const userId = u?.userId || u?.id || u?.sub || u?._id;
    return this.service.findMyHistory(
      userId,
      limit ? parseInt(limit, 10) : 20,
      skip ? parseInt(skip, 10) : 0,
    );
  }

  // GET /api/v1/quality-grading-records/:id
  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const u = (req as any).user;
    const userId = u?.userId || u?.id || u?.sub || u?._id;
    return this.service.findOne(id, userId);
  }

  // DELETE /api/v1/quality-grading-records/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Req() req: Request, @Param('id') id: string) {
    const u = (req as any).user;
    const userId = u?.userId || u?.id || u?.sub || u?._id;
    return this.service.remove(id, userId);
  }
}
