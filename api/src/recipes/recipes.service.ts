import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Recipe, RecipeDocument } from './recipe.schema';
import { CreateRecipeDto, RecipeQueryDto } from './dto/recipe.dto';

@Injectable()
export class RecipesService {
  constructor(@InjectModel(Recipe.name) private model: Model<RecipeDocument>) {}

  async findAll(userId: string, query: RecipeQueryDto) {
    const { q, tag, category, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = {
      authorId: new Types.ObjectId(userId),
    };

    if (q) filter.$text = { $search: q };
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

  async findOne(id: string, userId: string) {
    const recipe = await this.model.findById(id).lean();
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId) throw new ForbiddenException();
    return recipe;
  }

  async create(userId: string, dto: CreateRecipeDto) {
    return this.model.create({
      ...dto,
      authorId: new Types.ObjectId(userId),
      categoryId: dto.categoryId
        ? new Types.ObjectId(dto.categoryId)
        : undefined,
    });
  }

  async update(id: string, userId: string, dto: Partial<CreateRecipeDto>) {
    const recipe = await this.model.findById(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId) throw new ForbiddenException();
    Object.assign(recipe, dto);
    return recipe.save();
  }

  async remove(id: string, userId: string) {
    const recipe = await this.model.findById(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId) throw new ForbiddenException();
    await recipe.deleteOne();
    return { deleted: true };
  }

  async setPhoto(id: string, userId: string, photoUrl: string) {
    const recipe = await this.model.findById(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId) throw new ForbiddenException();
    recipe.photoUrl = photoUrl;
    return recipe.save();
  }
}
