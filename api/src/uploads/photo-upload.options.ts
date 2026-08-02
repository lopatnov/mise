import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Image types accepted for upload, mapped to the extension the file is stored under.
 * The extension comes from this map and never from the client-supplied filename: uploads
 * are served back from our own origin, so a file stored as .html would run as a page there.
 */
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function isAllowedPhotoType(mimetype: string): boolean {
  return Object.hasOwn(EXT_BY_MIME, mimetype);
}

/** Random storage name for an accepted upload, with the extension of its validated MIME type */
export function photoFilename(mimetype: string): string {
  return `${uuidv4()}${EXT_BY_MIME[mimetype] ?? ''}`;
}

/** Shared multer config for every photo upload endpoint — one place for the size limit and allowed types */
export const photoUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
    filename: (_, file, cb) => cb(null, photoFilename(file.mimetype)),
  }),
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter: (_, file, cb) => {
    if (isAllowedPhotoType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Only image files are allowed'), false);
    }
  },
};
