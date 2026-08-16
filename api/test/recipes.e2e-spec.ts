import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface RecipeResponse {
  _id: string;
  title: string;
  description?: string;
  authorId: string;
  savedBy: string[];
  photoUrl?: string;
  cookNotes: { text: string; rating?: number }[];
  ingredients: { name: string; amount: number; unit: string }[];
  steps: { order: number; text: string; photoUrl?: string }[];
}

/**
 * Regression coverage for `PATCH /recipes/:id` mass-assignment (fixed by introducing a real
 * `UpdateRecipeDto` instead of the TS-only `Partial<CreateRecipeDto>` type alias, which erased to
 * `Object` and made Nest's global ValidationPipe skip validation/whitelisting entirely for this
 * endpoint) and for nested `ingredients`/`steps` validation now actually running (fixed by adding
 * `@ValidateNested({ each: true })`, which was missing).
 */
describe('Recipes update (e2e)', () => {
  let app: INestApplication<App>;
  let ownerToken: string;
  let ownerUserId: string;
  let otherUserId: string;
  let recipeId: string;

  const ownerEmail = `e2e-recipe-owner-${Date.now()}@mise.test`;
  const otherEmail = `e2e-recipe-other-${Date.now()}@mise.test`;
  const password = 'secret123';

  /** Register + verify a user via the same flow app.e2e-spec.ts uses, returning its access token. */
  async function registerAndVerify(email: string): Promise<string> {
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);
    const devLink = (registerRes.body as { devLink?: string }).devLink as string;
    const verifyToken = new URL(devLink).searchParams.get('token');
    const verifyRes = await request(app.getHttpServer())
      .get('/api/auth/verify-email')
      .query({ token: verifyToken })
      .expect(200);
    return (verifyRes.body as { access_token: string }).access_token;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    ownerToken = await registerAndVerify(ownerEmail);
    const otherToken = await registerAndVerify(otherEmail);

    const ownerMe = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    ownerUserId = (ownerMe.body as { userId: string }).userId;

    const otherMe = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    otherUserId = (otherMe.body as { userId: string }).userId;

    const createRes = await request(app.getHttpServer())
      .post('/api/recipes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Original Recipe Title',
        description: 'Original description',
        ingredients: [{ name: 'Flour', amount: 200, unit: 'g' }],
        steps: [{ order: 1, text: 'Mix the flour' }],
        tags: ['baking'],
        servings: 4,
        isPublic: false,
      })
      .expect(201);
    const created = createRes.body as RecipeResponse;
    recipeId = created._id;
    expect(created.authorId).toBe(ownerUserId);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Regression: mass-assignment via PATCH body must be rejected ────────────────

  it('PATCH /api/recipes/:id strips fields outside UpdateRecipeDto (authorId, savedBy, photoUrl, cookNotes)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        // A legitimate field, so the request looks like a real (if malicious) client payload,
        // not an empty body.
        description: 'Updated via a request that also tries to mass-assign other fields',
        // None of the following are on CreateRecipeDto/UpdateRecipeDto — under the old
        // `Partial<CreateRecipeDto>` typing (erased to `Object`, validation skipped entirely)
        // these would have silently been written straight onto the document.
        authorId: otherUserId,
        savedBy: [otherUserId],
        photoUrl: '/uploads/attacker-controlled.png',
        cookNotes: [{ text: 'injected via mass-assignment', rating: 5 }],
      })
      .expect(200);

    const body = res.body as RecipeResponse;
    expect(body.description).toBe('Updated via a request that also tries to mass-assign other fields');
    expect(body.authorId).toBe(ownerUserId);
    expect(body.savedBy).toEqual([]);
    expect(body.photoUrl).toBeUndefined();
    expect(body.cookNotes).toEqual([]);

    // Re-fetch independently of the PATCH response to confirm the rejection was actually
    // persisted, not just something the (possibly stale) response happened to echo back.
    const refetch = await request(app.getHttpServer())
      .get(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const persisted = refetch.body as RecipeResponse;
    expect(persisted.authorId).toBe(ownerUserId);
    expect(persisted.savedBy).toEqual([]);
    expect(persisted.photoUrl).toBeUndefined();
    expect(persisted.cookNotes).toEqual([]);
  });

  // ── Regression: nested ingredients/steps validators must actually run ──────────

  it('PATCH /api/recipes/:id rejects a step with an invalid sourceOrder (fails @Min(1)) → 400', () => {
    return request(app.getHttpServer())
      .patch(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        steps: [{ order: 1, text: 'Mix the flour', sourceOrder: 0 }],
      })
      .expect(400);
  });

  it('PATCH /api/recipes/:id rejects an ingredient with a non-numeric amount → 400', () => {
    return request(app.getHttpServer())
      .patch(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        ingredients: [{ name: 'Flour', amount: 'a lot', unit: 'g' }],
      })
      .expect(400);
  });

  // ── A legitimate update, shaped like what RecipeFormPage actually sends, still works ──

  it('PATCH /api/recipes/:id with a real edit payload → 200 and persists', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Updated Recipe Title',
        description: 'Updated description',
        servings: 6,
        prepTime: 10,
        cookTime: 20,
        rating: 4,
        tags: ['baking', 'dessert'],
        isPublic: true,
        ingredients: [{ name: 'Flour', amount: 250, unit: 'g' }],
        steps: [{ order: 1, text: 'Mix the flour thoroughly', sourceOrder: 1 }],
      })
      .expect(200);

    const body = res.body as RecipeResponse;
    expect(body.title).toBe('Updated Recipe Title');
    expect(body.description).toBe('Updated description');
    // toMatchObject, not toEqual: Mongoose auto-generates an _id on each array subdocument that
    // isn't predictable/relevant here, only the fields the update actually set.
    expect(body.ingredients).toMatchObject([{ name: 'Flour', amount: 250, unit: 'g' }]);
    expect(body.steps).toHaveLength(1);
    expect(body.steps[0]).toMatchObject({ order: 1, text: 'Mix the flour thoroughly' });

    const refetch = await request(app.getHttpServer())
      .get(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const persisted = refetch.body as RecipeResponse;
    expect(persisted.title).toBe('Updated Recipe Title');
    expect(persisted.ingredients).toMatchObject([{ name: 'Flour', amount: 250, unit: 'g' }]);
  });
});
