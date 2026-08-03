import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { fetchPinned, isSsrfSafe, type PinnedResponse } from '../common/safe-http';
import { RecipeImportService } from './recipe-import.service';

jest.mock('../common/safe-http');

const safeUrl = { url: new URL('https://example.com/recipe'), address: '93.184.216.34', family: 4 as const };

const respondWith = (body: string, { contentType = 'text/html; charset=utf-8', ok = true, status = 200 } = {}) =>
  ({
    ok,
    status,
    getHeader: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : undefined),
    buffer: () => Promise.resolve(Buffer.from(body, 'utf-8')),
  }) as PinnedResponse;

describe('RecipeImportService', () => {
  let service: RecipeImportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mocked(isSsrfSafe).mockResolvedValue(safeUrl);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RecipeImportService],
    }).compile();

    service = module.get<RecipeImportService>(RecipeImportService);
  });

  it('returns the recipe parsed from the fetched page', async () => {
    const jsonLd = JSON.stringify({ '@type': 'Recipe', name: 'Pancakes', recipeIngredient: ['2 eggs'] });
    jest.mocked(fetchPinned).mockResolvedValue(respondWith(`<script type="application/ld+json">${jsonLd}</script>`));

    const result = await service.importFromUrl('https://example.com/recipe');

    expect(result.title).toBe('Pancakes');
    expect(result.ingredients).toEqual([{ amount: 2, unit: '', name: 'eggs' }]);
  });

  it('caps the fetched page size', async () => {
    const jsonLd = JSON.stringify({ '@type': 'Recipe', name: 'Pancakes', recipeIngredient: ['2 eggs'] });
    jest.mocked(fetchPinned).mockResolvedValue(respondWith(`<script type="application/ld+json">${jsonLd}</script>`));

    await service.importFromUrl('https://example.com/recipe');

    expect(fetchPinned).toHaveBeenCalledWith(
      safeUrl,
      expect.objectContaining({ maxBytes: 2 * 1024 * 1024, timeoutMs: 10_000 }),
    );
  });

  it('rejects a URL that failed the SSRF check without fetching it', async () => {
    jest.mocked(isSsrfSafe).mockResolvedValue(false);

    await expect(service.importFromUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(BadRequestException);
    expect(fetchPinned).not.toHaveBeenCalled();
  });

  it('reports a non-2xx response as a bad request', async () => {
    jest.mocked(fetchPinned).mockResolvedValue(respondWith('', { ok: false, status: 404 }));

    await expect(service.importFromUrl('https://example.com/recipe')).rejects.toThrow(/HTTP 404/);
  });

  it('reports a transport failure as a bad request', async () => {
    jest.mocked(fetchPinned).mockRejectedValue(new Error('Request timeout'));

    await expect(service.importFromUrl('https://example.com/recipe')).rejects.toThrow(/Request timeout/);
  });

  it('throws when the page holds no recipe data', async () => {
    jest.mocked(fetchPinned).mockResolvedValue(respondWith('<html><body>nothing</body></html>'));

    await expect(service.importFromUrl('https://example.com/recipe')).rejects.toThrow(BadRequestException);
  });

  it('decodes the page using the charset from the meta tag when the header has none', async () => {
    const body = Buffer.concat([
      Buffer.from('<html><head><meta charset="windows-1251"><title>', 'latin1'),
      Buffer.from([0xc1, 0xee, 0xf0, 0xf9]), // "Борщ" in windows-1251
      Buffer.from('</title></head></html>', 'latin1'),
    ]);
    jest.mocked(fetchPinned).mockResolvedValue({
      ok: true,
      status: 200,
      getHeader: () => 'text/html',
      buffer: () => Promise.resolve(body),
    } as PinnedResponse);

    const result = await service.importFromUrl('https://example.com/recipe');

    expect(result.title).toBe('Борщ');
  });
});
