import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { Category } from './category.schema';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockModel = {
    updateOne: jest.fn().mockResolvedValue({}),
    countDocuments: jest.fn(),
    insertMany: jest.fn().mockResolvedValue([]),
    find: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: getModelToken(Category.name), useValue: mockModel }],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  // ── seed ──────────────────────────────────────────────────────────────────

  describe('seed', () => {
    it('inserts default categories when collection is empty', async () => {
      mockModel.countDocuments.mockResolvedValue(0);

      await service.seed();

      expect(mockModel.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Breakfast' })]),
      );
    });

    it('skips insertMany when categories already exist', async () => {
      mockModel.countDocuments.mockResolvedValue(5);

      await service.seed();

      expect(mockModel.insertMany).not.toHaveBeenCalled();
    });

    it('runs slug migrations for every legacy name', async () => {
      mockModel.countDocuments.mockResolvedValue(5);

      await service.seed();

      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { name: 'Завтрак', slug: { $exists: false } },
        { $set: { slug: 'breakfast' } },
      );
      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { name: 'Суп', slug: { $exists: false } },
        { $set: { slug: 'soup' } },
      );
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all categories', async () => {
      const cats = [{ name: 'Breakfast', icon: '🍳' }];
      mockModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(cats) });

      const result = await service.findAll();

      expect(mockModel.find).toHaveBeenCalled();
      expect(result).toEqual(cats);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a category with name and icon', async () => {
      const cat = { name: 'Test', icon: '🍕' };
      mockModel.create.mockResolvedValue(cat);

      const result = await service.create('Test', '🍕');

      expect(mockModel.create).toHaveBeenCalledWith({ name: 'Test', icon: '🍕' });
      expect(result).toEqual(cat);
    });

    it('creates a category without icon', async () => {
      mockModel.create.mockResolvedValue({ name: 'NoIcon' });

      await service.create('NoIcon');

      expect(mockModel.create).toHaveBeenCalledWith({ name: 'NoIcon', icon: undefined });
    });
  });
});
