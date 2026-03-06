import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

export const boatMulterOptions = {
  storage: diskStorage({
    destination: './uploads/boats',
    filename: (req, file, cb) => {
      const userId =
        (req as any).user?.userId || (req as any).user?.id || 'unknown';
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      const safeBase = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9-_]/g, '');

      cb(null, `boat-${userId}-${timestamp}-${safeBase}${ext}`);
    },
  }),

  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB

  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      return cb(
        new BadRequestException('Please upload a valid image (jpg/jpeg/png).'),
        false,
      );
    }
    cb(null, true);
  },
};