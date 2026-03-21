import { Injectable, type OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { unlink } from 'node:fs/promises';
import { join } from 'path';

@Injectable()
export class UploadsService implements OnModuleInit {
  onModuleInit() {
    mkdirSync(join(process.cwd(), 'uploads'), { recursive: true });
  }

  buildPhotoUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  async deletePhoto(photoUrl: string | null | undefined): Promise<void> {
    if (!photoUrl) return;
    const filename = photoUrl.replace(/^\/uploads\//, '');
    if (!filename || filename.includes('/')) return;
    try {
      await unlink(join(process.cwd(), 'uploads', filename));
    } catch {
      // file already gone — ignore
    }
  }
}
