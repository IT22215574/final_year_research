import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

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

const imageFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowed = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
  ];
  if (!allowed.includes(file.mimetype.toLowerCase())) {
    return cb(
      new BadRequestException(
        'Only jpg/jpeg/png/webp/heic images are allowed.',
      ),
      false,
    );
  }
  cb(null, true);
};

export const fishCategoryMulterOptions = {
  storage: diskStorage({
    destination: (req: any, file: Express.Multer.File, cb: any) => {
      const dest = './uploads/fish-categories';
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (req: any, file: Express.Multer.File, cb: any) => {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      const safeBase = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9-_]/g, '');
      cb(null, `fish-${timestamp}-${safeBase}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFileFilter,
};

export const fishMarketMulterOptions = {
  storage: diskStorage({
    destination: (req: any, file: Express.Multer.File, cb: any) => {
      const dest = './uploads/fish-market';
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (req: any, file: Express.Multer.File, cb: any) => {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      const safeBase = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9-_]/g, '');
      cb(null, `market-${timestamp}-${safeBase}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFileFilter,
};

export const gradingRecordMulterOptions = {
  storage: diskStorage({
    destination: (req: any, file: Express.Multer.File, cb: any) => {
      const dest = './uploads/grading-records';
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (req: any, file: Express.Multer.File, cb: any) => {
      const userId =
        (req as any).user?.userId || (req as any).user?.id || 'unknown';
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `grade-${userId}-${timestamp}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFileFilter,
};
