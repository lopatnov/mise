import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { fetchPinned, isSsrfSafe } from '../common/safe-http';

const DOWNLOAD_TIMEOUT_MS = 10_000;
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

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

  /**
   * Download an external image into the uploads directory and return its photo URL.
   * Returns undefined when the URL is unsafe or unreachable — an imported recipe is
   * still worth keeping without its photo.
   */
  async savePhotoFromUrl(url: string): Promise<string | undefined> {
    const safe = await isSsrfSafe(url);
    if (!safe) return undefined;
    try {
      const res = await fetchPinned(safe, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
      if (!res.ok) return undefined;
      const mime = (res.getHeader('content-type') ?? '').split(';')[0].trim();
      const fallbackExt = extname(safe.url.pathname).toLowerCase() || '.jpg';
      const filename = `imported-${randomUUID()}${EXT_BY_MIME[mime] ?? fallbackExt}`;
      await writeFile(join(this.uploadsDir, filename), await res.buffer());
      return this.buildPhotoUrl(filename);
    } catch {
      return undefined;
    }
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
