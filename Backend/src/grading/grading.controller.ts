import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { GradingService } from './grading.service';

@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Post('predict')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'side1', maxCount: 1 },
      { name: 'side2', maxCount: 1 },
    ]),
  )
  async predict(
    @UploadedFiles()
    files: {
      side1?: Express.Multer.File[];
      side2?: Express.Multer.File[];
    },
  ) {
    const side1 = files?.side1?.[0];
    const side2 = files?.side2?.[0];

    if (!side1 || !side2) {
      throw new BadRequestException('Both images are required: side1 and side2');
    }

    return this.gradingService.predictFromFiles({
      side1Path: side1.path,
      side2Path: side2.path,
    });
  }
}
