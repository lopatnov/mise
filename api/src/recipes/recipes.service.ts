import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type { CreateRecipeDto, RecipeQueryDto } from './dto/recipe.dto';
import { Recipe, type RecipeDocument } from './recipe.schema';

@Injectable()
export class RecipesService {
  constructor(@InjectModel(Recipe.name) private model: Model<RecipeDocument>) {}

  async findAll(userId: string, isAdmin: boolean, query: RecipeQueryDto) {
    const { q, tag, category, page = 1, limit = 20, mine } = query;
    const filter: Record<string, unknown> = {};

    if (mine) {
      filter.authorId = new Types.ObjectId(userId);
    } else if (!isAdmin) {
      filter.$or = [{ authorId: new Types.ObjectId(userId) }, { isPublic: true }];
    }
    // admin + !mine → no ownership filter (see all)

    if (tag) filter.tags = tag;
    if (category) filter.categoryId = new Types.ObjectId(category);

    if (q) {
      const searchOr = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
      if (filter.$or) {
        // visibility and search both use $or — combine with $and
        filter.$and = [{ $or: filter.$or as unknown[] }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, userId?: string, isAdmin = false) {
    const recipe = await this.model.findById(id).lean();
    if (!recipe) throw new NotFoundException('Recipe not found');
    const isOwner = !!userId && recipe.authorId.toString() === userId;
    if (!recipe.isPublic && !isOwner && !isAdmin) throw new ForbiddenException();
    return recipe;
  }

  async create(userId: string, dto: CreateRecipeDto) {
    return this.model.create({
      ...dto,
      authorId: new Types.ObjectId(userId),
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
    });
  }

  async update(id: string, userId: string, isAdmin: boolean, dto: Partial<CreateRecipeDto>) {
    const recipe = await this.model.findById(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId && !isAdmin) throw new ForbiddenException();
    if (dto.steps) {
      const existingByOrder = new Map(recipe.steps.map((s) => [s.order, s.photoUrl as string | undefined]));
      recipe.set(
        'steps',
        dto.steps.map((s) => ({
          order: s.order,
          text: s.text,
          photoUrl: existingByOrder.get(s.order),
        })),
      );
      const { steps: _steps, ...rest } = dto;
      Object.assign(recipe, rest);
    } else {
      Object.assign(recipe, dto);
    }
    return recipe.save();
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const recipe = await this.model.findById(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId && !isAdmin) throw new ForbiddenException();
    await recipe.deleteOne();
    return { deleted: true };
  }

  async setPhoto(id: string, userId: string, isAdmin: boolean, photoUrl: string) {
    const recipe = await this.model.findById(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId && !isAdmin) throw new ForbiddenException();
    recipe.photoUrl = photoUrl;
    return recipe.save();
  }

  async findPublic(query: RecipeQueryDto) {
    const { q, tag, category, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = { isPublic: true };
    if (q)
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
    if (tag) filter.tags = tag;
    if (category) filter.categoryId = new Types.ObjectId(category);

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async setStepPhoto(id: string, userId: string, isAdmin: boolean, order: number, photoUrl: string) {
    const recipe = await this.model.findById(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId && !isAdmin) throw new ForbiddenException();
    const step = recipe.steps.find((s) => s.order === order);
    if (!step) throw new NotFoundException('Step not found');
    step.photoUrl = photoUrl;
    recipe.markModified('steps');
    return recipe.save();
  }

  async findAllTags(): Promise<string[]> {
    return this.model.distinct('tags');
  }
}
