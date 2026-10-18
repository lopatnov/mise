import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fetchPinned, isSsrfSafe } from '../common/safe-http';
import { MAX_PHOTO_BYTES, photoExtension } from './photo-upload.options';

const DOWNLOAD_TIMEOUT_MS = 10_000;

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
      const res = await fetchPinned(safe, { timeoutMs: DOWNLOAD_TIMEOUT_MS, maxBytes: MAX_PHOTO_BYTES });
      if (!res.ok) return undefined;
      const mime = (res.getHeader('content-type') ?? '').split(';')[0].trim();
      const ext = photoExtension(mime);
      if (!ext) return undefined;
      const filename = `imported-${randomUUID()}${ext}`;
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
    // Stored names are plain files directly inside uploadsDir. Resolving also catches what the '/' check
    // misses: '.' and '..' (which name directories) and, on Windows, backslash separators and drive paths.
    const root = resolve(this.uploadsDir);
    const target = resolve(root, filename);
    if (dirname(target) !== root) return;
    try {
      await unlink(target);
    } catch {
      // file already gone — ignore
    }
  }
}
