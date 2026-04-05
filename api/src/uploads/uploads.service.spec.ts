import { unlink } from 'node:fs/promises';
import { Test, type TestingModule } from '@nestjs/testing';
import { mkdirSync } from 'fs';
import { UploadsService } from './uploads.service';

jest.mock('node:fs/promises');
jest.mock('fs');

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mocked(mkdirSync).mockReturnValue(undefined);

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
