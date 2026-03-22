import { unlink } from 'node:fs/promises';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService implements OnModuleInit {
  private get uploadsDir(): string {
    return join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
  }

  onModuleInit() {
    mkdirSync(this.uploadsDir, { recursive: true });
  }

  buildPhotoUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  async deletePhoto(photoUrl: string | null | undefined): Promise<void> {
    if (!photoUrl) return;
    const filename = photoUrl.replace(/^\/uploads\//, '');
    if (!filename || filename.includes('/')) return;
    try {
      await unlink(join(this.uploadsDir, filename));
    } catch {
      // file already gone — ignore
    }
  }
}
