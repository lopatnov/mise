import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RecipesService } from './recipes.service';
import { Recipe } from './recipe.schema';

/** Creates a mock Mongoose query that supports both:
 *  - chaining: .sort().skip().limit().lean()
 *  - direct await: await model.findById(id)
 */
const mockQuery = (value: unknown) => {
  const q = {
    lean: jest.fn().mockResolvedValue(value),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(value).then(res, rej),
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

  const mockModel = {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: getModelToken(Recipe.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated recipes', async () => {
      const items = [{ title: 'Pasta' }];
      mockModel.find.mockReturnValue(mockQuery(items));
      mockModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll(userId, {});

      expect(result).toEqual({ items, total: 1, page: 1, limit: 20 });
      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: new Types.ObjectId(userId) }),
      );
    });

    it('applies text search filter when q is provided', async () => {
      mockModel.find.mockReturnValue(mockQuery([]));
      mockModel.countDocuments.mockResolvedValue(0);

      await service.findAll(userId, { q: 'soup' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ $text: { $search: 'soup' } }),
      );
    });

    it('applies tag filter', async () => {
      mockModel.find.mockReturnValue(mockQuery([]));
      mockModel.countDocuments.mockResolvedValue(0);

      await service.findAll(userId, { tag: 'vegan' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ tags: 'vegan' }),
      );
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a recipe owned by the user', async () => {
      const id = new Types.ObjectId();
      const recipe = { _id: id, authorId: { toString: () => userId }, title: 'Borsch' };
      mockModel.findById.mockReturnValue(mockQuery(recipe));

      const result = await service.findOne(id.toString(), userId);

      expect(result.title).toBe('Borsch');
    });

    it('throws NotFoundException when recipe does not exist', async () => {
      mockModel.findById.mockReturnValue(mockQuery(null));

      await expect(service.findOne('nonexistent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when recipe belongs to another user', async () => {
      const otherId = new Types.ObjectId().toString();
      const recipe = { authorId: { toString: () => otherId } };
      mockModel.findById.mockReturnValue(mockQuery(recipe));

      await expect(service.findOne('someId', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a recipe and sets authorId from userId', async () => {
      const dto = { title: 'Soup' };
      const created = { ...dto, authorId: new Types.ObjectId(userId) };
      mockModel.create.mockResolvedValue(created);

      const result = await service.create(userId, dto as Parameters<typeof service.create>[1]);

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: new Types.ObjectId(userId) }),
      );
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

      await service.update('id', userId, { title: 'New' });

      expect(doc.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when recipe does not exist', async () => {
      mockModel.findById.mockReturnValue(mockQuery(null));

      await expect(service.update('id', userId, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when recipe belongs to another user', async () => {
      const other = new Types.ObjectId().toString();
      const doc = { authorId: { toString: () => other }, save: jest.fn() };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await expect(service.update('id', userId, {})).rejects.toThrow(
        ForbiddenException,
      );
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

      const result = await service.remove('id', userId);

      expect(result).toEqual({ deleted: true });
      expect(doc.deleteOne).toHaveBeenCalled();
    });

    it('throws NotFoundException when recipe does not exist', async () => {
      mockModel.findById.mockReturnValue(mockQuery(null));

      await expect(service.remove('id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when recipe belongs to another user', async () => {
      const other = new Types.ObjectId().toString();
      const doc = { authorId: { toString: () => other }, deleteOne: jest.fn() };
      mockModel.findById.mockReturnValue(mockQuery(doc));

      await expect(service.remove('id', userId)).rejects.toThrow(
        ForbiddenException,
      );
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

      await service.setPhoto('id', userId, '/uploads/photo.jpg');

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

      await service.setStepPhoto('id', userId, 2, '/uploads/step.jpg');

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

      await expect(
        service.setStepPhoto('id', userId, 99, '/uploads/x.jpg'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
