import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TrainingUploadsService } from './training-uploads.service';
import { TrainingUploadsController } from './training-uploads.controller';
import {
  UploadedDataset,
  UploadedDatasetSchema,
} from '../schemas/uploaded-dataset.schema';
import { AuthModule } from '../auth/auth.module';
import { TrainingCandidatesModule } from '../training-candidates/training-candidates.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UploadedDataset.name, schema: UploadedDatasetSchema },
    ]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
      fileFilter: (req, file, cb) => {
        // Only allow CSV and JSON files
        const allowedMimes = [
          'text/csv',
          'application/json',
          'text/plain', // Sometimes CSV is text/plain
        ];
        const allowedExtensions = ['.csv', '.json'];

        const filename = file.originalname.toLowerCase();
        const hasAllowedExt = allowedExtensions.some((ext) =>
          filename.endsWith(ext),
        );

        if (hasAllowedExt) {
          cb(null, true);
        } else {
          cb(
            new Error(
              'Only CSV and JSON files are allowed. Filename must end with .csv or .json',
            ),
            false,
          );
        }
      },
    }),
    AuthModule,
    TrainingCandidatesModule,
  ],
  controllers: [TrainingUploadsController],
  providers: [TrainingUploadsService],
  exports: [TrainingUploadsService],
})
export class TrainingUploadsModule {}
