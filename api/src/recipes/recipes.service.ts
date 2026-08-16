import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import { UploadsService } from '../uploads/uploads.service';
import type { AddCookNoteDto, CreateRecipeDto, RecipeQueryDto, StepDto, UpdateRecipeDto } from './dto/recipe.dto';
import { Recipe, type RecipeDocument } from './recipe.schema';
import { makeSlug } from './recipe-slug';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_COOK_NOTES = 200;

/** Escape special regex characters in a user-provided string */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True for MongoDB's duplicate-key error (E11000) — the race the slug uniqueness check can't fully close */
function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

/** Fields a free-text search looks at, as $or conditions */
function searchConditions(q: string): Record<string, unknown>[] {
  const safeQ = escapeRegex(q);
  return [
    { title: { $regex: safeQ, $options: 'i' } },
    { description: { $regex: safeQ, $options: 'i' } },
    { tags: { $regex: safeQ, $options: 'i' } },
  ];
}

/**
 * Combine a visibility filter with the user's search/tag/category filters.
 * Visibility and search both use $or, so they are merged with $and when both are present.
 */
function buildFilter(visibility: Record<string, unknown>, query: RecipeQueryDto): Record<string, unknown> {
  const filter = { ...visibility };
  if (query.tag) filter.tags = String(query.tag);
  if (query.category) filter.categoryId = new Types.ObjectId(query.category);
  if (query.q) {
    const searchOr = searchConditions(String(query.q));
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or as unknown[] }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }
  return filter;
}

/** Keep paging inside sane bounds — a malformed or oversized limit must not dump the whole collection */
function normalizePaging(page = 1, limit = DEFAULT_PAGE_SIZE): { page: number; limit: number } {
  return {
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    limit: Number.isFinite(limit) && limit >= 1 ? Math.min(Math.floor(limit), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
  };
}

@Injectable()
export class RecipesService implements OnModuleInit {
  constructor(
    @InjectModel(Recipe.name) private model: Model<RecipeDocument>,
    private uploads: UploadsService,
  ) {}

  /** Backfill slugs for recipes created before slugs existed */
  async onModuleInit() {
    const recipes = await this.model.find({ slug: { $exists: false } }, { _id: 1, title: 1 }).lean();
    for (const r of recipes) {
      const slug = await this.generateUniqueSlug(r.title, r._id.toString());
      await this.model.updateOne({ _id: r._id }, { $set: { slug } });
    }
  }

  // ── Reading ──────────────────────────────────────────────────────────────

  async findAll(userId: string, isAdmin: boolean, query: RecipeQueryDto) {
    const visibility: Record<string, unknown> = {};
    if (query.saved) {
      visibility.savedBy = new Types.ObjectId(userId);
    } else if (query.mine) {
      visibility.authorId = new Types.ObjectId(userId);
    } else if (!isAdmin) {
      visibility.$or = [{ authorId: new Types.ObjectId(userId) }, { isPublic: true }];
    }
    // admin + !mine + !saved → no ownership filter (see all)

    return this.paginate(buildFilter(visibility, query), query);
  }

  async findPublic(query: RecipeQueryDto) {
    return this.paginate(buildFilter({ isPublic: true }, query), query);
  }

  async findOne(id: string, userId?: string, isAdmin = false) {
    const recipe = await this.findByIdOrSlug(id).lean();
    if (!recipe) throw new NotFoundException('Recipe not found');
    const isOwner = !!userId && recipe.authorId.toString() === userId;
    if (!recipe.isPublic && !isOwner && !isAdmin) throw new ForbiddenException();
    // cookNotes are private — strip them for anyone but the owner/admin, even on an otherwise-visible recipe
    if (!isOwner && !isAdmin) recipe.cookNotes = [];
    return recipe;
  }

  async findAllTags(userId?: string, isAdmin = false): Promise<string[]> {
    const filter: Record<string, unknown> = {};
    if (isAdmin) {
      // admin sees tags from all recipes
    } else if (userId) {
      filter.$or = [{ authorId: new Types.ObjectId(userId) }, { isPublic: true }];
    } else {
      filter.isPublic = true;
    }
    return this.model.distinct('tags', filter);
  }

  async findPublicForSitemap(): Promise<Array<{ _id: unknown; updatedAt: Date }>> {
    const docs = await this.model.find({ isPublic: true }, { _id: 1, updatedAt: 1 }).lean();
    return docs as unknown as Array<{ _id: unknown; updatedAt: Date }>;
  }

  // ── Writing ──────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateRecipeDto) {
    const photoUrl = dto.externalImageUrl ? await this.uploads.savePhotoFromUrl(dto.externalImageUrl) : undefined;
    const steps = await Promise.all(
      (dto.steps ?? []).map(async (step) => ({
        order: step.order,
        text: step.text,
        photoUrl: step.externalImageUrl ? await this.uploads.savePhotoFromUrl(step.externalImageUrl) : undefined,
      })),
    );

    // generateUniqueSlug()'s check-then-insert isn't atomic — the schema's unique index on `slug`
    // is the real guarantee. Retry with a fresh slug if a concurrent create won the same one.
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.model.create({
          ...dto,
          slug: await this.generateUniqueSlug(dto.title),
          photoUrl,
          steps,
          authorId: new Types.ObjectId(userId),
          categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
        });
      } catch (err) {
        if (!isDuplicateKeyError(err) || attempt === maxAttempts) throw err;
        lastError = err;
      }
    }
    throw lastError;
  }

  async update(id: string, userId: string, isAdmin: boolean, dto: UpdateRecipeDto) {
    const recipe = await this.findOwnedOrFail(id, userId, isAdmin);
    if (dto.steps) {
      // Steps are replaced wholesale — keep the photo already uploaded for each step, matched by the
      // order that step had before this edit (sourceOrder), so reordering or removing steps doesn't
      // hand a photo to a different step. A new externalImageUrl still wins, matching create().
      const photoByOrder = new Map(recipe.steps.map((s) => [s.order, s.photoUrl as string | undefined]));
      // Clients older than sourceOrder send none at all — they still get the previous positional
      // match. When the payload does carry it, a step without one was just added by this edit and
      // must start photoless instead of inheriting the photo of whatever step held that position.
      const identifiesSteps = dto.steps.some((s) => s.sourceOrder !== undefined);
      const keptPhotoOf = (s: StepDto): string | undefined => {
        const previousOrder = identifiesSteps ? s.sourceOrder : s.order;
        return previousOrder === undefined ? undefined : photoByOrder.get(previousOrder);
      };
      const steps = await Promise.all(
        dto.steps.map(async (s) => ({
          order: s.order,
          text: s.text,
          photoUrl: s.externalImageUrl ? await this.uploads.savePhotoFromUrl(s.externalImageUrl) : keptPhotoOf(s),
        })),
      );
      recipe.set('steps', steps);
      const { steps: _steps, ...rest } = dto;
      Object.assign(recipe, rest);
      const saved = await recipe.save();
      // Only after the save succeeds: photos of steps this update dropped (or replaced) are no
      // longer referenced by the document, so their files would otherwise stay behind forever
      await this.deleteUnreferencedPhotos(photoByOrder.values(), steps);
      return saved;
    }
    Object.assign(recipe, dto);
    return recipe.save();
  }

  /** Delete previously stored photo files that no step of the saved recipe points at any more */
  private async deleteUnreferencedPhotos(
    previousPhotoUrls: Iterable<string | undefined>,
    steps: { photoUrl?: string }[],
  ) {
    const stillUsed = new Set(steps.map((s) => s.photoUrl).filter(Boolean));
    for (const photoUrl of previousPhotoUrls) {
      if (photoUrl && !stillUsed.has(photoUrl)) await this.uploads.deletePhoto(photoUrl);
    }
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const recipe = await this.findOwnedOrFail(id, userId, isAdmin);
    await recipe.deleteOne();
    return { deleted: true };
  }

  async setPhoto(id: string, userId: string, isAdmin: boolean, photoUrl: string) {
    const recipe = await this.findOwnedOrFail(id, userId, isAdmin);
    await this.uploads.deletePhoto(recipe.photoUrl);
    recipe.photoUrl = photoUrl;
    return recipe.save();
  }

  async setStepPhoto(id: string, userId: string, isAdmin: boolean, order: number, photoUrl: string) {
    const recipe = await this.findOwnedOrFail(id, userId, isAdmin);
    const step = recipe.steps.find((s) => s.order === order);
    if (!step) throw new NotFoundException('Step not found');
    await this.uploads.deletePhoto(step.photoUrl as string | undefined);
    step.photoUrl = photoUrl;
    recipe.markModified('steps');
    return recipe.save();
  }

  async addFavorite(recipeId: string, userId: string) {
    const recipe = await this.findOrFail(recipeId);
    await this.model.updateOne({ _id: recipe._id }, { $addToSet: { savedBy: new Types.ObjectId(userId) } });
    return { saved: true };
  }

  async removeFavorite(recipeId: string, userId: string) {
    const recipe = await this.findOrFail(recipeId);
    await this.model.updateOne({ _id: recipe._id }, { $pull: { savedBy: new Types.ObjectId(userId) } });
    return { saved: false };
  }

  async addCookNote(id: string, userId: string, isAdmin: boolean, dto: AddCookNoteDto) {
    const recipe = await this.findOwnedOrFail(id, userId, isAdmin);
    const note = { _id: new Types.ObjectId(), text: dto.text.trim(), rating: dto.rating, createdAt: new Date() };
    // Atomic: the array-size check and the push happen in one query, so two concurrent
    // requests can't both pass an in-memory length check and push past MAX_COOK_NOTES.
    const updated = await this.model.findOneAndUpdate(
      { _id: recipe._id, $expr: { $lt: [{ $size: '$cookNotes' }, MAX_COOK_NOTES] } },
      { $push: { cookNotes: note } },
      { new: true },
    );
    if (!updated) {
      throw new BadRequestException('Cook log is full — remove an old entry first');
    }
    return updated.cookNotes;
  }

  async removeCookNote(id: string, userId: string, isAdmin: boolean, noteId: string) {
    const recipe = await this.findOwnedOrFail(id, userId, isAdmin);
    const before = recipe.cookNotes.length;
    recipe.cookNotes = recipe.cookNotes.filter((n) => n._id.toString() !== noteId);
    if (recipe.cookNotes.length !== before) {
      recipe.markModified('cookNotes');
      await recipe.save();
    }
    return recipe.cookNotes;
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private async paginate(filter: Record<string, unknown>, query: RecipeQueryDto) {
    const { page, limit } = normalizePaging(query.page, query.limit);
    const [items, total] = await Promise.all([
      // cookNotes are private and never shown in list views (own or others') — exclude unconditionally
      this.model
        .find(filter, { cookNotes: 0 })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  private findByIdOrSlug(idOrSlug: string) {
    return /^[0-9a-f]{24}$/i.test(idOrSlug) ? this.model.findById(idOrSlug) : this.model.findOne({ slug: idOrSlug });
  }

  private async findOrFail(idOrSlug: string): Promise<RecipeDocument> {
    const recipe = await this.findByIdOrSlug(idOrSlug);
    if (!recipe) throw new NotFoundException('Recipe not found');
    return recipe;
  }

  /** Load a recipe the user is allowed to modify — 404 when missing, 403 when it belongs to someone else */
  private async findOwnedOrFail(idOrSlug: string, userId: string, isAdmin: boolean): Promise<RecipeDocument> {
    const recipe = await this.findOrFail(idOrSlug);
    if (recipe.authorId.toString() !== userId && !isAdmin) throw new ForbiddenException();
    return recipe;
  }

  /** Slug from the title, suffixed with -2, -3, … until it is unique (bounded, with a timestamp fallback) */
  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = makeSlug(title);
    let slug = base;
    const maxAttempts = 50;
    for (let n = 1; n <= maxAttempts; n++) {
      const filter: Record<string, unknown> = { slug };
      if (excludeId) filter._id = { $ne: new Types.ObjectId(excludeId) };
      if (!(await this.model.exists(filter))) return slug;
      slug = `${base}-${n + 1}`;
    }
    return `${base}-${Date.now()}`;
  }
}
