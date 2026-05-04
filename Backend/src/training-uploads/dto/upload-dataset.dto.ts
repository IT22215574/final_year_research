import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadDatasetDto {
  @IsNotEmpty()
  @IsEnum(['IDAT', 'IMUI', 'MTRP', 'OFRP'])
  boatType: string; // Which boat type this data belongs to

  @IsOptional()
  @IsString()
  description?: string; // Optional description of upload
}

export class ApproveUploadDto {
  @IsOptional()
  @IsString()
  reason?: string; // Reason for approval
}

export class RejectUploadDto {
  @IsNotEmpty()
  @IsString()
  reason: string; // Required reason for rejection
}
