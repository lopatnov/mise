import { createServer, type Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createE2eApp, registerAndVerify } from './helpers/e2e-app';

// The SSRF guard rightly refuses loopback addresses, and the fixture "recipe site" below lives on one.
// Allow exactly that and keep everything else real: controllers, importer, pinned HTTP fetch, parsers,
// photo download and MongoDB.
jest.mock('../src/common/safe-http', () => ({
  ...jest.requireActual('../src/common/safe-http'),
  isSsrfSafe: jest.fn((url: string) => Promise.resolve({ url: new URL(url), address: '127.0.0.1', family: 4 })),
}));

interface ImportedResponse {
  title: string;
  servings?: number;
  ingredients: { name: string; amount: number; unit: string }[];
  steps: { order: number; text: string }[];
  externalImageUrl?: string;
}

interface RecipeResponse {
  _id: string;
  title: string;
  slug: string;
  photoUrl?: string;
}

// A valid 1x1 PNG, so the photo download sees a real image/png response.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * The flow that broke for a real user: import a recipe by URL, save it, then import again. Every step goes
 * through the real HTTP API, and each recipe page and its photo are fetched from a local fixture site so the
 * test can also count that the repeat imports really reached it.
 */
describe('Recipe import → create → import again (e2e)', () => {
  let app: INestApplication<App>;
  let fixtureSite: Server;
  let baseUrl: string;
  let token: string;
  const hits = new Map<string, number>();
  const createdIds: string[] = [];

  const stamp = Date.now();
  const titleA = `Baked Ziti ${stamp}`;
  const titleB = `Chicken And Gnocchi Soup ${stamp}`;
  const email = `e2e-import-${stamp}@mise.test`;

  function recipePage(name: string, imagePath: string): string {
    const recipe = {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name,
      image: `${baseUrl}${imagePath}`,
      recipeYield: '6',
      recipeIngredient: ['1 pound ziti pasta', '2 cups tomato sauce'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Boil the pasta.' },
        { '@type': 'HowToStep', text: 'Bake until bubbling.' },
      ],
    };
    return `<html><head><script type="application/ld+json">${JSON.stringify(recipe)}</script></head><body></body></html>`;
  }

  async function importUrl(path: string): Promise<ImportedResponse> {
    const res = await request(app.getHttpServer())
      .post('/api/recipes/import-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: `${baseUrl}${path}` })
      .expect(201);
    return res.body as ImportedResponse;
  }

  /** Import the same URL `times` times, each one only after the previous finished (never in parallel). */
  async function importSequentially(path: string, times: number): Promise<ImportedResponse[]> {
    if (times === 0) return [];
    const first = await importUrl(path);
    return [first, ...(await importSequentially(path, times - 1))];
  }

  /** Save an imported recipe the way the web form does: its fields plus the imported photo URL. */
  async function createFrom(imported: ImportedResponse): Promise<RecipeResponse> {
    const res = await request(app.getHttpServer())
      .post('/api/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: imported.title,
        servings: imported.servings,
        ingredients: imported.ingredients,
        steps: imported.steps.map(({ order, text }) => ({ order, text })),
        externalImageUrl: imported.externalImageUrl,
      })
      .expect(201);
    const recipe = res.body as RecipeResponse;
    createdIds.push(recipe._id);
    return recipe;
  }

  beforeAll(async () => {
    fixtureSite = createServer((req, res) => {
      const path = req.url ?? '';
      hits.set(path, (hits.get(path) ?? 0) + 1);
      if (path === '/recipe-a') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8').end(recipePage(titleA, '/photo-a.png'));
      } else if (path === '/recipe-b') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8').end(recipePage(titleB, '/photo-b.png'));
      } else if (path.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png').end(PNG);
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise<void>((resolve) => fixtureSite.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(fixtureSite.address() as { port: number }).port}`;

    app = await createE2eApp();
    token = await registerAndVerify(app, email);
  });

  afterAll(async () => {
    await Promise.all(
      createdIds.map((id) =>
        request(app.getHttpServer()).delete(`/api/recipes/${id}`).set('Authorization', `Bearer ${token}`),
      ),
    );
    await app.close();
    await new Promise((resolve) => fixtureSite.close(resolve));
  });

  it('imports a recipe from a URL', async () => {
    const imported = await importUrl('/recipe-a');

    expect(imported.title).toBe(titleA);
    expect(imported.servings).toBe(6);
    expect(imported.ingredients).toHaveLength(2);
    expect(imported.steps.map((s) => s.text)).toEqual(['Boil the pasta.', 'Bake until bubbling.']);
    expect(imported.externalImageUrl).toBe(`${baseUrl}/photo-a.png`);
  });

  it('saves the imported recipe together with its downloaded photo', async () => {
    const recipe = await createFrom(await importUrl('/recipe-a'));

    expect(recipe.slug).toMatch(/^baked-ziti-\d+/);
    expect(recipe.photoUrl).toMatch(/^\/uploads\/imported-.+\.png$/);
  });

  it('imports and saves a second, different recipe straight afterwards', async () => {
    const recipe = await createFrom(await importUrl('/recipe-b'));

    expect(recipe.title).toBe(titleB);
    expect(recipe.photoUrl).toMatch(/^\/uploads\/imported-.+\.png$/);
  });

  it('keeps importing the same URL over and over without restarting anything', async () => {
    const before = hits.get('/recipe-a') ?? 0;

    const imports = await importSequentially('/recipe-a', 5);

    expect(imports.map((imported) => imported.title)).toEqual(Array.from({ length: 5 }, () => titleA));
    expect((hits.get('/recipe-a') ?? 0) - before).toBe(5);
  });

  it('gives a recipe saved twice from the same import its own slug instead of failing', async () => {
    const first = await createFrom(await importUrl('/recipe-b'));
    const second = await createFrom(await importUrl('/recipe-b'));

    expect(first.slug).not.toBe(second.slug);
  });

  it('rejects an import URL that is not a recipe page with a clear 400, then keeps working', async () => {
    await request(app.getHttpServer())
      .post('/api/recipes/import-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: `${baseUrl}/missing` })
      .expect(400);

    expect((await importUrl('/recipe-a')).title).toBe(titleA);
  });
});
