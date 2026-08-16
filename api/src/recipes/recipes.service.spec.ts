import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UploadsService } from '../uploads/uploads.service';
import { Recipe } from './recipe.schema';
import { RecipesService } from './recipes.service';

/** Creates a mock Mongoose query that supports both:
 *  - chaining: .sort().skip().limit().lean()
 *  - direct await: await model.findById(id)
 */
const mockQuery = (value: unknown) => {
  const q = {
    lean: jest.fn().mockResolvedValue(value),

    // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for Mongoose query compatibility
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(value).then(res, rej),
    catch: (fn: (e: unknown) => unknown) => Promise.resolve(value).catch(fn),
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
  };
  q.sort.mockReturnValue(q);
  q.skip.mockReturnValue(q);
  q.limit.mockReturnValue(q);
  return q;
};

describe('RecipesService', () => {
  let service: RecipesService;

  const userId = new Types.ObjectId().toString();
  const recipeId = new Types.ObjectId().toString();

  const mockModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    distinct: jest.fn(),
    exists: jest.fn(),
    updateOne: jest.fn(),
  };

  // Declared here (not just inside beforeEach) so individual tests can assert on its calls.
  let mockUploadsService: {
    buildPhotoUrl: jest.Mock;
    deletePhoto: jest.Mock;
    savePhotoFromUrl: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUploadsService = {
      buildPhotoUrl: jest.fn((filename: string) => `/uploads/${filename}`),
      deletePhoto: jest.fn().mockResolvedValue(undefined),
      savePhotoFromUrl: jest.fn().mockResolvedValue('/uploads/fresh-external.jpg'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: getModelToken(Recipe.name), useValue: mockModel },
        { provide: UploadsService, useValue: mockUploadsService },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated recipes for regular user (own + public)', async () => {
      const items = [{ title: 'Pasta' }];
      mockModel.find.mockReturnValue(mockQuery(items));
      mockModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll(userId, false, {});

      expect(result).toEqual({ items, total: 1, page: 1, limit: 20 });
      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ $or: [{ authorId: new Types.ObjectId(userId) }, { isPublic: true }] }),
        { cookNotes: 0 },
      );
    });

    it('returns all recipes for admin', async () => {
      mockModel.find.mockReturnValue(mockQuery([]));
      mockModel.countDocuments.mockResolvedValue(0);

      await service.findAll(userId, true, {});

      // admin with no mine flag → empty filter (no authorId restriction)
      expect(mockModel.find).toHaveBeenCalledWith({}, { cookNotes: 0 });
    });

    it('applies mine filter', async () => {
      mockModel.find.mockReturnValue(mockQuery([]));
      mockModel.countDocuments.mockResolvedValue(0);

      await service.findAll(userId, false, { mine: true });

      expect(mockModel.find).toHaveBeenCalledWith(expect.objectContaining({ authorId: new Types.ObjectId(userId) }), {
        cookNotes: 0,
      });
    });

    it('applies text search filter when q is provided', async () => {
      mockModel.find.mockReturnValue(mockQuery([]));
      mockModel.countDocuments.mockResolvedValue(0);

      // use admin=true to avoid $or conflict with visibility filter
      await service.findAll(userId, true, { q: 'soup' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([{ title: { $regex: 'soup', $options: 'i' } }]),
        }),
        { cookNotes: 0 },
      );
    });

    it('applies tag filter', async () => {
      mockModel.find.mockReturnValue(mockQuery([]));
      mockModel.countDocuments.mockResolvedValue(0);

      await service.findAll(userId, false, { tag: 'vegan' });

      expect(mockModel.find).toHaveBeenCalledWith(expect.objectContaining({ tags: 'vegan' }), { cookNotes: 0 });
    });

    it('combines visibility and search with $and', async () => {
      mockModel.find.mockReturnValue(mockQuery([]));
      mockModel.countDocuments.mockResolvedValue(0);

      await service.findAll(userId, false, { q: 'soup' });

      const filter = mockModel.find.mock.calls[0][0] as Record<string, unknown>;
      expect(filter.$or).toBeUndefined();
      expect(filter.$and).toHaveLength(2);
    });

    it('caps an oversized limit', async () => {
      const query = mockQuery([]);
      mockModel.find.mockReturnValue(query);
      mockModel.countDocuments.mockResolvedValue(0);

      const result = await service.findAll(userId, true, { limit: 5000 });

      expect(result.limit).toBe(100);
      expect(query.limit).toHaveBeenCalledWith(100);
    });

    it('falls back to the default page size for a non-positive limit', async () => {
      const query = mockQuery([]);
      mockModel.find.mockReturnValue(query);
      mockModel.countDocuments.mockResolvedValue(0);

      const result = await service.findAll(userId, true, { limit: 0, page: 0 });

      expect(result).toEqual(expect.objectContaining({ page: 1, limit: 20 }));
      expect(query.skip).toHaveBeenCalledWith(0);
    });
  });

  // ── findPublic ───────────────────────────────────────────────────────────

  describe('findPublic', () => {
    it('restricts the query to public recipes', async () => {
      mockModel.find.mockReturnValue(mockQuery([]));
      mockModel.countDocuments.mockResolvedValue(0);

      await service.findPublic({});

      expect(mockModel.find).toHaveBeenCalledWith({ isPublic: true }, { cookNotes: 0 });
    });

    it('applies text search alongside the public filter', async () => {
      mockModel.find.mockReturnValue(mockQuery([]));
      mockModel.countDocuments.mockResolvedValue(0);

      await service.findPublic({ q: 'so.up' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isPublic: true,
          // regex metacharacters from user input are escaped
          $or: expect.arrayContaining([{ title: { $regex: 'so\\.up', $options: 'i' } }]),
        }),
        { cookNotes: 0 },
      );
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a recipe owned by the user', async () => {
      const id = new Types.ObjectId();
      const recipe = {
        _id: id,
        authorId: { toString: () => userId },
        title: 'Borsch',
      };
      mockModel.findById.mockReturnValue(mockQuery(recipe));

      const result = await service.findOne(id.toString(), userId);

      expect(result.title).toBe('Borsch');
    });

    it('throws NotFoundException when recipe does not exist', async () => {
      mockModel.findById.mockReturnValue(mockQuery(null));

      await expect(service.findOne(recipeId, userId)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when recipe belongs to another user', async () => {
      const otherId = new Types.ObjectId().toString();
      const recipe = { authorId: { toString: () => otherId } };
      mockModel.findById.mockReturnValue(mockQuery(recipe));

      await expect(service.findOne(recipeId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('keeps cookNotes for the owner', async () => {
      const recipe = {
        authorId: { toString: () => userId },
        isPublic: true,
        cookNotes: [{ text: 'Great with extra garlic' }],
      };
      mockModel.findById.mockReturnValue(mockQuery(recipe));

      const result = await service.findOne(recipeId, userId);

      expect(result.cookNotes).toHaveLength(1);
    });

    it('strips cookNotes for a non-owner viewing a public recipe', async () => {
      const otherId = new Types.ObjectId().toString();
      const recipe = {
        authorId: { toString: () => otherId },
        isPublic: true,
        cookNotes: [{ text: 'Secret note' }],
      };
      mockModel.findById.mockReturnValue(mockQuery(recipe));

      const result = await service.findOne(recipeId, userId);

      expect(result.cookNotes).toEqual([]);
    });

    it('keeps cookNotes for an admin', async () => {
      const otherId = new Types.ObjectId().toString();
      const recipe = {
        authorId: { toString: () => otherId },
        isPublic: true,
        cookNotes: [{ text: 'Note' }],
      };
      mockModel.findById.mockReturnValue(mockQuery(recipe));

      const result = await service.findOne(recipeId, userId, true);

      expect(result.cookNotes).toHaveLength(1);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a recipe and sets authorId from userId', async () => {
      const dto = { title: 'Soup' };
      const created = { ...dto, authorId: new Types.ObjectId(userId) };
      mockModel.exists.mockResolvedValue(null);
      mockModel.create.mockResolvedValue(created);

      const result = await service.create(userId, dto as Parameters<typeof service.create>[1]);

      expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({ authorId: new Types.ObjectId(userId) }));
      expect(result.title).toBe('Soup');
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and saves the recipe', async () => {
      const doc = {
        authorId: { toString: () => userId },
        title: 'Old',
        save: jest.fn().mockResolvedValue({ title: 'New' }),
      };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await service.update(recipeId, userId, false, { title: 'New' });

      expect(doc.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when recipe does not exist', async () => {
      mockModel.findById.mockReturnValue(mockQuery(null));

      await expect(service.update(recipeId, userId, false, {})).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when recipe belongs to another user', async () => {
      const other = new Types.ObjectId().toString();
      const doc = { authorId: { toString: () => other }, save: jest.fn() };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await expect(service.update(recipeId, userId, false, {})).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to update recipe owned by another user', async () => {
      const other = new Types.ObjectId().toString();
      const doc = { authorId: { toString: () => other }, title: 'Old', save: jest.fn().mockResolvedValue({}) };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await service.update(recipeId, userId, true, { title: 'New' });

      expect(doc.save).toHaveBeenCalled();
    });

    // ── steps photo matching ────────────────────────────────────────────────

    /** Build a mock recipe document whose `steps` array is the state *before* the update. */
    function docWithSteps(steps: { order: number; text: string; photoUrl?: string }[]) {
      return {
        authorId: { toString: () => userId },
        steps,
        set: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      };
    }

    it('keeps each photo with its own step when steps are reordered (matched by sourceOrder, not array position)', async () => {
      const doc = docWithSteps([
        { order: 1, text: 'A', photoUrl: '/uploads/photo1.jpg' },
        { order: 2, text: 'B', photoUrl: '/uploads/photo2.jpg' },
        { order: 3, text: 'C' },
      ]);
      mockModel.findById.mockReturnValue(mockQuery(doc));

      // Reordered to C, A, B — each carries the order it had before this edit.
      await service.update(recipeId, userId, false, {
        steps: [
          { order: 1, text: 'C', sourceOrder: 3 },
          { order: 2, text: 'A', sourceOrder: 1 },
          { order: 3, text: 'B', sourceOrder: 2 },
        ],
      } as Parameters<typeof service.update>[3]);

      const savedSteps = doc.set.mock.calls[0][1] as { order: number; text: string; photoUrl?: string }[];
      // Without the fix, positional matching would have handed photo1 to C (now at position 1)
      // and photo2 to A (now at position 2) — the exact bug this test guards against.
      expect(savedSteps.find((s) => s.text === 'C')?.photoUrl).toBeUndefined();
      expect(savedSteps.find((s) => s.text === 'A')?.photoUrl).toBe('/uploads/photo1.jpg');
      expect(savedSteps.find((s) => s.text === 'B')?.photoUrl).toBe('/uploads/photo2.jpg');
      // Nothing was dropped by this edit, so no cleanup should happen.
      expect(mockUploadsService.deletePhoto).not.toHaveBeenCalled();
    });

    it('cleans up the photo of a deleted middle step and keeps the photos of the surviving steps', async () => {
      const doc = docWithSteps([
        { order: 1, text: 'A', photoUrl: '/uploads/photo1.jpg' },
        { order: 2, text: 'B', photoUrl: '/uploads/photo2.jpg' },
        { order: 3, text: 'C', photoUrl: '/uploads/photo3.jpg' },
      ]);
      mockModel.findById.mockReturnValue(mockQuery(doc));

      // B is removed; A and C carry the order they had before the edit.
      await service.update(recipeId, userId, false, {
        steps: [
          { order: 1, text: 'A', sourceOrder: 1 },
          { order: 2, text: 'C', sourceOrder: 3 },
        ],
      } as Parameters<typeof service.update>[3]);

      const savedSteps = doc.set.mock.calls[0][1] as { order: number; text: string; photoUrl?: string }[];
      expect(savedSteps.find((s) => s.text === 'A')?.photoUrl).toBe('/uploads/photo1.jpg');
      expect(savedSteps.find((s) => s.text === 'C')?.photoUrl).toBe('/uploads/photo3.jpg');
      expect(mockUploadsService.deletePhoto).toHaveBeenCalledWith('/uploads/photo2.jpg');
      expect(mockUploadsService.deletePhoto).toHaveBeenCalledTimes(1);
    });

    it('does not hand a newly inserted step the photo that used to sit at its array position', async () => {
      const doc = docWithSteps([
        { order: 1, text: 'A', photoUrl: '/uploads/photo1.jpg' },
        { order: 2, text: 'B', photoUrl: '/uploads/photo2.jpg' },
      ]);
      mockModel.findById.mockReturnValue(mockQuery(doc));

      // A brand-new step is inserted between A and B — it has no sourceOrder because it never
      // existed before this edit, so positional matching would otherwise steal B's old photo.
      await service.update(recipeId, userId, false, {
        steps: [
          { order: 1, text: 'A', sourceOrder: 1 },
          { order: 2, text: 'NEW' },
          { order: 3, text: 'B', sourceOrder: 2 },
        ],
      } as Parameters<typeof service.update>[3]);

      const savedSteps = doc.set.mock.calls[0][1] as { order: number; text: string; photoUrl?: string }[];
      expect(savedSteps.find((s) => s.text === 'NEW')?.photoUrl).toBeUndefined();
      expect(savedSteps.find((s) => s.text === 'A')?.photoUrl).toBe('/uploads/photo1.jpg');
      expect(savedSteps.find((s) => s.text === 'B')?.photoUrl).toBe('/uploads/photo2.jpg');
    });

    it('does not fall back to positional matching when no step carries sourceOrder — every step starts photoless and old photos are cleaned up', async () => {
      const doc = docWithSteps([
        { order: 1, text: 'A', photoUrl: '/uploads/photo1.jpg' },
        { order: 2, text: 'B', photoUrl: '/uploads/photo2.jpg' },
      ]);
      mockModel.findById.mockReturnValue(mockQuery(doc));

      // No step in the payload carries sourceOrder at all — e.g. all steps were deleted and replaced
      // with fresh ones in the same edit. There is deliberately no positional fallback for this case:
      // web and api ship together, so treating "no sourceOrder anywhere" as trustworthy legacy-client
      // input would silently hand each new step whatever photo used to sit at its array position.
      await service.update(recipeId, userId, false, {
        steps: [
          { order: 1, text: 'A edited' },
          { order: 2, text: 'B edited' },
        ],
      } as Parameters<typeof service.update>[3]);

      const savedSteps = doc.set.mock.calls[0][1] as { order: number; text: string; photoUrl?: string }[];
      expect(savedSteps.find((s) => s.order === 1)?.photoUrl).toBeUndefined();
      expect(savedSteps.find((s) => s.order === 2)?.photoUrl).toBeUndefined();
      expect(mockUploadsService.deletePhoto).toHaveBeenCalledWith('/uploads/photo1.jpg');
      expect(mockUploadsService.deletePhoto).toHaveBeenCalledWith('/uploads/photo2.jpg');
    });

    it('prefers a freshly-fetched externalImageUrl photo over the one sourceOrder would otherwise keep', async () => {
      const doc = docWithSteps([{ order: 1, text: 'A', photoUrl: '/uploads/photo1.jpg' }]);
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await service.update(recipeId, userId, false, {
        steps: [{ order: 1, text: 'A', sourceOrder: 1, externalImageUrl: 'https://example.com/new.jpg' }],
      } as Parameters<typeof service.update>[3]);

      expect(mockUploadsService.savePhotoFromUrl).toHaveBeenCalledWith('https://example.com/new.jpg');
      const savedSteps = doc.set.mock.calls[0][1] as { order: number; text: string; photoUrl?: string }[];
      expect(savedSteps[0].photoUrl).toBe('/uploads/fresh-external.jpg');
      // The step's old photo is no longer referenced once it's been replaced — it must be cleaned up.
      expect(mockUploadsService.deletePhoto).toHaveBeenCalledWith('/uploads/photo1.jpg');
    });

    it('keeps the existing photo when a re-fetch of externalImageUrl fails, instead of dropping it', async () => {
      const doc = docWithSteps([{ order: 1, text: 'A', photoUrl: '/uploads/photo1.jpg' }]);
      mockModel.findById.mockReturnValue(mockQuery(doc));
      // SSRF block, non-ok response, unsupported MIME type, or a thrown error all resolve undefined.
      mockUploadsService.savePhotoFromUrl.mockResolvedValueOnce(undefined);

      await service.update(recipeId, userId, false, {
        steps: [{ order: 1, text: 'A', sourceOrder: 1, externalImageUrl: 'https://example.com/broken.jpg' }],
      } as Parameters<typeof service.update>[3]);

      const savedSteps = doc.set.mock.calls[0][1] as { order: number; text: string; photoUrl?: string }[];
      expect(savedSteps[0].photoUrl).toBe('/uploads/photo1.jpg');
      expect(mockUploadsService.deletePhoto).not.toHaveBeenCalled();
    });

    it('cleans up both photos of two malformed old steps sharing the same order, not just one', async () => {
      // Two stored steps sharing an order is malformed (StepDto doesn't enforce uniqueness) — cleanup
      // must not rely on the order-keyed Map, which would collapse them and drop one photo silently.
      const doc = docWithSteps([
        { order: 1, text: 'A', photoUrl: '/uploads/photo1a.jpg' },
        { order: 1, text: 'A duplicate', photoUrl: '/uploads/photo1b.jpg' },
        { order: 2, text: 'B', photoUrl: '/uploads/photo2.jpg' },
      ]);
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await service.update(recipeId, userId, false, {
        steps: [{ order: 1, text: 'B', sourceOrder: 2 }],
      } as Parameters<typeof service.update>[3]);

      const savedSteps = doc.set.mock.calls[0][1] as { order: number; text: string; photoUrl?: string }[];
      expect(savedSteps[0].photoUrl).toBe('/uploads/photo2.jpg');
      expect(mockUploadsService.deletePhoto).toHaveBeenCalledWith('/uploads/photo1a.jpg');
      expect(mockUploadsService.deletePhoto).toHaveBeenCalledWith('/uploads/photo1b.jpg');
      expect(mockUploadsService.deletePhoto).toHaveBeenCalledTimes(2);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes the recipe and returns { deleted: true }', async () => {
      const doc = {
        authorId: { toString: () => userId },
        deleteOne: jest.fn().mockResolvedValue({}),
      };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      const result = await service.remove(recipeId, userId, false);

      expect(result).toEqual({ deleted: true });
      expect(doc.deleteOne).toHaveBeenCalled();
    });

    it('throws NotFoundException when recipe does not exist', async () => {
      mockModel.findById.mockReturnValue(mockQuery(null));

      await expect(service.remove(recipeId, userId, false)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when recipe belongs to another user', async () => {
      const other = new Types.ObjectId().toString();
      const doc = { authorId: { toString: () => other }, deleteOne: jest.fn() };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await expect(service.remove(recipeId, userId, false)).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to remove recipe owned by another user', async () => {
      const other = new Types.ObjectId().toString();
      const doc = { authorId: { toString: () => other }, deleteOne: jest.fn().mockResolvedValue({}) };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      const result = await service.remove(recipeId, userId, true);

      expect(result).toEqual({ deleted: true });
      expect(doc.deleteOne).toHaveBeenCalled();
    });
  });

  // ── setPhoto ─────────────────────────────────────────────────────────────

  describe('setPhoto', () => {
    it('sets photoUrl and saves', async () => {
      const doc = {
        authorId: { toString: () => userId },
        photoUrl: '',
        save: jest.fn().mockResolvedValue({}),
      };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await service.setPhoto(recipeId, userId, false, '/uploads/photo.jpg');

      expect(doc.photoUrl).toBe('/uploads/photo.jpg');
      expect(doc.save).toHaveBeenCalled();
    });
  });

  // ── setStepPhoto ─────────────────────────────────────────────────────────

  describe('setStepPhoto', () => {
    it('sets photoUrl on the matching step by order', async () => {
      const steps: { order: number; text: string; photoUrl?: string }[] = [
        { order: 1, text: 'Chop' },
        { order: 2, text: 'Fry' },
      ];
      const doc = {
        authorId: { toString: () => userId },
        steps,
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await service.setStepPhoto(recipeId, userId, false, 2, '/uploads/step.jpg');

      expect(steps[1].photoUrl).toBe('/uploads/step.jpg');
      expect(doc.markModified).toHaveBeenCalledWith('steps');
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when step order does not exist', async () => {
      const doc = {
        authorId: { toString: () => userId },
        steps: [{ order: 1, text: 'Chop' }],
        markModified: jest.fn(),
        save: jest.fn(),
      };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await expect(service.setStepPhoto(recipeId, userId, false, 99, '/uploads/x.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── addCookNote ──────────────────────────────────────────────────────────

  describe('addCookNote', () => {
    it('appends a note atomically and returns the updated list', async () => {
      const doc = { _id: new Types.ObjectId(recipeId), authorId: { toString: () => userId }, cookNotes: [] };
      mockModel.findById.mockReturnValue(mockQuery(doc));
      const updatedNotes = [{ _id: new Types.ObjectId(), text: 'Add more salt', rating: 4, createdAt: new Date() }];
      mockModel.findOneAndUpdate.mockResolvedValue({ cookNotes: updatedNotes });

      const result = await service.addCookNote(recipeId, userId, false, { text: 'Add more salt', rating: 4 });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: doc._id }),
        { $push: { cookNotes: expect.objectContaining({ text: 'Add more salt', rating: 4 }) } },
        { new: true },
      );
      expect(result).toBe(updatedNotes);
    });

    it('trims surrounding whitespace before storing the note', async () => {
      const doc = { _id: new Types.ObjectId(recipeId), authorId: { toString: () => userId }, cookNotes: [] };
      mockModel.findById.mockReturnValue(mockQuery(doc));
      mockModel.findOneAndUpdate.mockResolvedValue({ cookNotes: [] });

      await service.addCookNote(recipeId, userId, false, { text: '  Add more salt  ' });

      const [, update] = mockModel.findOneAndUpdate.mock.calls[0];
      expect(update.$push.cookNotes.text).toBe('Add more salt');
    });

    it('throws ForbiddenException when recipe belongs to another user', async () => {
      const other = new Types.ObjectId().toString();
      const doc = { authorId: { toString: () => other }, cookNotes: [] };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await expect(service.addCookNote(recipeId, userId, false, { text: 'x' })).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when the cook log is full', async () => {
      const doc = { _id: new Types.ObjectId(recipeId), authorId: { toString: () => userId }, cookNotes: [] };
      mockModel.findById.mockReturnValue(mockQuery(doc));
      // The atomic $expr size guard rejects the update — findOneAndUpdate matches nothing
      mockModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(service.addCookNote(recipeId, userId, false, { text: 'one more' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── removeCookNote ───────────────────────────────────────────────────────

  describe('removeCookNote', () => {
    it('removes the matching note and saves', async () => {
      const keepId = new Types.ObjectId();
      const removeId = new Types.ObjectId();
      const doc = {
        authorId: { toString: () => userId },
        cookNotes: [
          { _id: keepId, text: 'Keep me' },
          { _id: removeId, text: 'Remove me' },
        ],
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      const result = await service.removeCookNote(recipeId, userId, false, removeId.toString());

      expect(doc.cookNotes).toHaveLength(1);
      expect(doc.cookNotes[0]._id).toBe(keepId);
      expect(doc.markModified).toHaveBeenCalledWith('cookNotes');
      expect(doc.save).toHaveBeenCalled();
      expect(result).toBe(doc.cookNotes);
    });

    it('does not save when the note id does not match anything', async () => {
      const doc = {
        authorId: { toString: () => userId },
        cookNotes: [{ _id: new Types.ObjectId(), text: 'Keep me' }],
        markModified: jest.fn(),
        save: jest.fn(),
      };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await service.removeCookNote(recipeId, userId, false, new Types.ObjectId().toString());

      expect(doc.cookNotes).toHaveLength(1);
      expect(doc.markModified).not.toHaveBeenCalled();
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when recipe belongs to another user', async () => {
      const other = new Types.ObjectId().toString();
      const doc = { authorId: { toString: () => other }, cookNotes: [], markModified: jest.fn(), save: jest.fn() };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await expect(service.removeCookNote(recipeId, userId, false, 'abc')).rejects.toThrow(ForbiddenException);
    });
  });
});
