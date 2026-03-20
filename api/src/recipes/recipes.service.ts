import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type { CreateRecipeDto, RecipeQueryDto } from './dto/recipe.dto';
import { Recipe, type RecipeDocument } from './recipe.schema';

/** Parse ISO 8601 duration (e.g. "PT1H30M", "PT20M") → minutes */
function parseDuration(iso: string): number | undefined {
  const m = /(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!m) return undefined;
  const hours = parseInt(m[1] ?? '0', 10);
  const mins = parseInt(m[2] ?? '0', 10);
  const total = hours * 60 + mins;
  return total > 0 ? total : undefined;
}

/** Parse first integer from a string (e.g. "4 servings" → 4, "Makes 4 to 6" → 4) */
function parseServings(raw: string | number | undefined): number | undefined {
  if (typeof raw === 'number') return raw > 0 ? raw : undefined;
  if (!raw) return undefined;
  const m = /(\d+)/.exec(String(raw));
  return m ? parseInt(m[1], 10) : undefined;
}

/** Parse ingredient string into name/amount/unit */
function parseIngredient(raw: string): { name: string; amount: number; unit: string } {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  // Match patterns like "1 1/2 cups", "2.5 grams", "1/3 cup", "3 large"
  const m = /^(\d+(?:[./]\d+)?(?:\s+\d+\/\d+)?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(.+)/.exec(cleaned);
  if (m) {
    const amountStr = m[1].includes('/')
      ? m[1].replace(/(\d+)\s+(\d+)\/(\d+)/, (_, w, n, d) =>
          String(parseInt(w, 10) + parseInt(n, 10) / parseInt(d, 10)),
        )
      : m[1];
    const amount = parseFloat(amountStr) || 1;
    return { amount, unit: m[2], name: m[3] };
  }
  // Just a number + name (e.g. "2 eggs")
  const m2 = /^(\d+(?:\.\d+)?)\s+(.+)/.exec(cleaned);
  if (m2) return { amount: parseFloat(m2[1]), unit: '', name: m2[2] };
  return { amount: 1, unit: '', name: cleaned };
}

/** Extract text from a JSON-LD HowToStep, string, or array */
function extractStepText(step: unknown): string {
  if (typeof step === 'string') return step;
  if (step && typeof step === 'object') {
    const s = step as Record<string, unknown>;
    if (typeof s.text === 'string') return s.text;
    if (typeof s.name === 'string') return s.name;
  }
  return '';
}

@Injectable()
export class RecipesService {
  constructor(@InjectModel(Recipe.name) private model: Model<RecipeDocument>) {}

  async findAll(userId: string, isAdmin: boolean, query: RecipeQueryDto) {
    const { q, tag, category, page = 1, limit = 20, mine, saved } = query;
    const filter: Record<string, unknown> = {};

    if (saved) {
      filter.savedBy = new Types.ObjectId(userId);
    } else if (mine) {
      filter.authorId = new Types.ObjectId(userId);
    } else if (!isAdmin) {
      filter.$or = [{ authorId: new Types.ObjectId(userId) }, { isPublic: true }];
    }
    // admin + !mine + !saved → no ownership filter (see all)

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

  async addFavorite(recipeId: string, userId: string) {
    const recipe = await this.model.findById(recipeId);
    if (!recipe) throw new NotFoundException('Recipe not found');
    await this.model.updateOne({ _id: recipeId }, { $addToSet: { savedBy: new Types.ObjectId(userId) } });
    return { saved: true };
  }

  async removeFavorite(recipeId: string, userId: string) {
    const recipe = await this.model.findById(recipeId);
    if (!recipe) throw new NotFoundException('Recipe not found');
    await this.model.updateOne({ _id: recipeId }, { $pull: { savedBy: new Types.ObjectId(userId) } });
    return { saved: false };
  }

  async findAllTags(): Promise<string[]> {
    return this.model.distinct('tags');
  }

  async findPublicForSitemap(): Promise<Array<{ _id: unknown; updatedAt: Date }>> {
    const docs = await this.model.find({ isPublic: true }, { _id: 1, updatedAt: 1 }).lean();
    return docs as unknown as Array<{ _id: unknown; updatedAt: Date }>;
  }

  async importFromUrl(url: string) {
    // Validate: only http/https
    if (!/^https?:\/\//i.test(url)) {
      throw new BadRequestException('Only http/https URLs are supported');
    }

    let html: string;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Mise-Bot/1.0; recipe importer)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Failed to fetch URL: ${msg}`);
    }

    // Try JSON-LD first
    const jsonLdBlocks = [
      ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
    ];
    for (const block of jsonLdBlocks) {
      try {
        const raw: unknown = JSON.parse(block[1]);
        const candidates: unknown[] = Array.isArray(raw)
          ? raw
          : (raw as Record<string, unknown>)['@graph']
            ? ((raw as Record<string, unknown>)['@graph'] as unknown[])
            : [raw];

        for (const item of candidates) {
          if (!item || typeof item !== 'object') continue;
          const obj = item as Record<string, unknown>;
          const type = obj['@type'];
          const isRecipe = type === 'Recipe' || (Array.isArray(type) && (type as string[]).includes('Recipe'));
          if (!isRecipe) continue;

          const rawInstructions = obj.recipeInstructions;
          const stepsRaw: unknown[] = Array.isArray(rawInstructions)
            ? rawInstructions
            : rawInstructions
              ? [rawInstructions]
              : [];
          const steps = stepsRaw
            .map(extractStepText)
            .filter(Boolean)
            .map((text, i) => ({ order: i + 1, text }));

          const rawIngredients = obj.recipeIngredient;
          const ingredients = (Array.isArray(rawIngredients) ? rawIngredients : []).map((r) =>
            parseIngredient(String(r)),
          );

          const keywordsRaw = obj.keywords;
          const tags =
            typeof keywordsRaw === 'string'
              ? keywordsRaw
                  .split(/[,;]/)
                  .map((t) => t.trim())
                  .filter(Boolean)
              : [];

          return {
            title: String(obj.name ?? '').trim() || 'Imported recipe',
            description: typeof obj.description === 'string' ? obj.description.slice(0, 2000) : undefined,
            servings: parseServings(obj.recipeYield as string | number | undefined),
            prepTime: typeof obj.prepTime === 'string' ? parseDuration(obj.prepTime) : undefined,
            cookTime: typeof obj.cookTime === 'string' ? parseDuration(obj.cookTime) : undefined,
            ingredients,
            steps,
            tags,
          };
        }
      } catch {
        // Malformed JSON-LD — try next block
      }
    }

    // Fallback: Open Graph meta tags
    const ogTitle = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
    const ogDesc =
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ??
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
    const pageTitle = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim();

    if (ogTitle ?? pageTitle) {
      return {
        title: (ogTitle ?? pageTitle ?? 'Imported recipe').trim(),
        description: ogDesc?.trim(),
      };
    }

    throw new BadRequestException('No recipe data found on this page');
  }
}
