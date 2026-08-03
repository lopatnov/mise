import { isAllowedPhotoType, MAX_PHOTO_BYTES, photoFilename, photoUploadOptions } from './photo-upload.options';

describe('photo upload options', () => {
  describe('isAllowedPhotoType', () => {
    it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])('accepts %s', (mime) => {
      expect(isAllowedPhotoType(mime)).toBe(true);
    });

    it.each(['text/html', 'image/svg+xml', 'application/javascript', 'application/pdf', ''])('rejects %s', (mime) => {
      expect(isAllowedPhotoType(mime)).toBe(false);
    });

    it('does not accept inherited Object properties as MIME types', () => {
      expect(isAllowedPhotoType('constructor')).toBe(false);
      expect(isAllowedPhotoType('toString')).toBe(false);
    });
  });

  describe('photoFilename', () => {
    it('names the file after its MIME type, not the upload', () => {
      expect(photoFilename('image/png')).toMatch(/^[0-9a-f-]{36}\.png$/);
      expect(photoFilename('image/jpeg')).toMatch(/\.jpg$/);
    });

    it('is unique per call', () => {
      expect(photoFilename('image/png')).not.toBe(photoFilename('image/png'));
    });
  });

  it('caps uploads at 5 MB', () => {
    expect(MAX_PHOTO_BYTES).toBe(5 * 1024 * 1024);
    expect(photoUploadOptions.limits?.fileSize).toBe(MAX_PHOTO_BYTES);
  });
});
