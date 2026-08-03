import { unlink, writeFile } from 'node:fs/promises';
import { Test, type TestingModule } from '@nestjs/testing';
import { mkdirSync } from 'fs';
import { fetchPinned, isSsrfSafe, type PinnedResponse } from '../common/safe-http';
import { UploadsService } from './uploads.service';

jest.mock('node:fs/promises');
jest.mock('fs');
jest.mock('../common/safe-http');

const safeUrl = { url: new URL('https://example.com/photo.png'), address: '93.184.216.34', family: 4 as const };

const imageResponse = (contentType: string | undefined, { ok = true, status = 200 } = {}) =>
  ({
    ok,
    status,
    getHeader: () => contentType,
    buffer: () => Promise.resolve(Buffer.from('binary')),
  }) as PinnedResponse;

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mocked(mkdirSync).mockReturnValue(undefined);
    jest.mocked(isSsrfSafe).mockResolvedValue(safeUrl);

    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadsService],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  // ── onModuleInit ──────────────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('creates the uploads directory with recursive flag', () => {
      service.onModuleInit();

      expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('uploads'), { recursive: true });
    });
  });

  // ── buildPhotoUrl ─────────────────────────────────────────────────────────

  describe('buildPhotoUrl', () => {
    it('returns /uploads/<filename>', () => {
      expect(service.buildPhotoUrl('photo.jpg')).toBe('/uploads/photo.jpg');
    });

    it('works with uuid filenames', () => {
      const name = 'imported-550e8400-e29b-41d4-a716-446655440000.webp';
      expect(service.buildPhotoUrl(name)).toBe(`/uploads/${name}`);
    });
  });

  // ── savePhotoFromUrl ──────────────────────────────────────────────────────

  describe('savePhotoFromUrl', () => {
    it('stores the download and returns its photo URL', async () => {
      jest.mocked(fetchPinned).mockResolvedValue(imageResponse('image/png'));

      const photoUrl = await service.savePhotoFromUrl('https://example.com/photo.png');

      expect(photoUrl).toMatch(/^\/uploads\/imported-[0-9a-f-]{36}\.png$/);
      expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('imported-'), expect.any(Buffer));
    });

    it('picks the extension from the content type, not the URL', async () => {
      jest.mocked(fetchPinned).mockResolvedValue(imageResponse('image/webp; charset=binary'));

      await expect(service.savePhotoFromUrl('https://example.com/photo.png')).resolves.toMatch(/\.webp$/);
    });

    it('rejects an unrecognized content type instead of trusting the URL extension', async () => {
      jest.mocked(fetchPinned).mockResolvedValue(imageResponse('application/octet-stream'));

      await expect(service.savePhotoFromUrl('https://example.com/photo.html')).resolves.toBeUndefined();
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('passes the photo size cap through to fetchPinned', async () => {
      jest.mocked(fetchPinned).mockResolvedValue(imageResponse('image/png'));

      await service.savePhotoFromUrl('https://example.com/photo.png');

      expect(fetchPinned).toHaveBeenCalledWith(safeUrl, expect.objectContaining({ maxBytes: expect.any(Number) }));
    });

    it('does not download a URL that failed the SSRF check', async () => {
      jest.mocked(isSsrfSafe).mockResolvedValue(false);

      await expect(service.savePhotoFromUrl('http://127.0.0.1/photo.png')).resolves.toBeUndefined();
      expect(fetchPinned).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('returns undefined on a non-2xx response', async () => {
      jest.mocked(fetchPinned).mockResolvedValue(imageResponse('image/png', { ok: false, status: 404 }));

      await expect(service.savePhotoFromUrl('https://example.com/photo.png')).resolves.toBeUndefined();
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('returns undefined when the download fails', async () => {
      jest.mocked(fetchPinned).mockRejectedValue(new Error('Request timeout'));

      await expect(service.savePhotoFromUrl('https://example.com/photo.png')).resolves.toBeUndefined();
    });
  });

  // ── deletePhoto ───────────────────────────────────────────────────────────

  describe('deletePhoto', () => {
    it('does nothing when photoUrl is null', async () => {
      await service.deletePhoto(null);
      expect(unlink).not.toHaveBeenCalled();
    });

    it('does nothing when photoUrl is undefined', async () => {
      await service.deletePhoto(undefined);
      expect(unlink).not.toHaveBeenCalled();
    });

    it('does nothing when photoUrl is an empty string', async () => {
      await service.deletePhoto('');
      expect(unlink).not.toHaveBeenCalled();
    });

    it('deletes the file for a valid /uploads/<filename> URL', async () => {
      jest.mocked(unlink).mockResolvedValue(undefined);

      await service.deletePhoto('/uploads/photo.jpg');

      expect(unlink).toHaveBeenCalledWith(expect.stringContaining('photo.jpg'));
    });

    it('silently ignores errors when the file is already gone', async () => {
      jest.mocked(unlink).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await expect(service.deletePhoto('/uploads/missing.jpg')).resolves.toBeUndefined();
    });

    it('rejects path traversal attempts (filename contains /)', async () => {
      await service.deletePhoto('/uploads/../secret.txt');
      expect(unlink).not.toHaveBeenCalled();
    });
  });
});
