import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
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
import type { CreateRecipeDto, RecipeQueryDto } from './dto/recipe.dto';
import { Recipe, type RecipeDocument } from './recipe.schema';

/** Parse duration in various formats → minutes */
function parseDuration(raw: string | number): number | undefined {
  if (typeof raw === 'number') return raw > 0 ? Math.round(raw) : undefined;
  const s = raw.trim();
  // ISO 8601: PT30M, PT1H30M, P0DT30M
  if (/^P/i.test(s)) {
    const h = /(\d+)H/i.exec(s);
    const m = /(\d+)M/i.exec(s);
    const total = parseInt(h?.[1] ?? '0', 10) * 60 + parseInt(m?.[1] ?? '0', 10);
    return total > 0 ? total : undefined;
  }
  // "H:MM" / "HH:MM"
  const hm = /^(\d+):(\d{2})$/.exec(s);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10) || undefined;
  // Plain number — assume minutes
  if (/^\d+$/.test(s)) return parseInt(s, 10) || undefined;
  // "X hour(s) Y min(utes)" in various languages
  const hourMatch = /(\d+)\s*(?:h(?:r|rs|ours?)?|час)/i.exec(s);
  const minMatch = /(\d+)\s*(?:m(?:in(?:utes?)?)?(?!\w)|мин)/i.exec(s);
  if (hourMatch ?? minMatch) {
    const total = parseInt(hourMatch?.[1] ?? '0', 10) * 60 + parseInt(minMatch?.[1] ?? '0', 10);
    return total > 0 ? total : undefined;
  }
  // Last resort: first number in string → assume minutes
  const first = /(\d+)/.exec(s);
  return first ? parseInt(first[1], 10) || undefined : undefined;
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
  const normNum = (s: string) => parseFloat(s.replace(',', '.'));
  // Match patterns like "1 1/2 cups", "2.5 grams", "2,5 гр", "1/3 cup", "3 large"
  const m = /^(\d+(?:[.,/]\d+)?(?:\s+\d+\/\d+)?)\s+([a-zA-Z\u0400-\u04ff]+(?:\s+[a-zA-Z\u0400-\u04ff]+)?)\s+(.+)/.exec(
    cleaned,
  );
  if (m) {
    const amountStr = m[1].includes('/')
      ? m[1].replace(/(\d+)\s+(\d+)\/(\d+)/, (_, w, n, d) =>
          String(parseInt(w, 10) + parseInt(n, 10) / parseInt(d, 10)),
        )
      : m[1];
    return { amount: normNum(amountStr) || 1, unit: m[2], name: m[3] };
  }
  // Just a number + name (e.g. "2 eggs", "2,5 стакана")
  const m2 = /^(\d+(?:[.,]\d+)?)\s+(.+)/.exec(cleaned);
  if (m2) return { amount: normNum(m2[1]), unit: '', name: m2[2] };
  return { amount: 1, unit: '', name: cleaned };
}

/** Extract image URL from JSON-LD image field (string, array, or ImageObject) */
function extractImageUrl(raw: unknown): string | undefined {
  if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) return raw;
  if (Array.isArray(raw) && raw.length > 0) return extractImageUrl(raw[0]);
  if (raw && typeof raw === 'object') {
    const url = (raw as Record<string, unknown>).url;
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url;
  }
  return undefined;
}

/** Download image from URL, save to uploadsDir, return filename or undefined on failure */
async function downloadImage(url: string, uploadsDir: string): Promise<string | undefined> {
  if (!(await isSsrfSafe(url))) return undefined;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return undefined;
    const mime = res.headers.get('content-type') ?? '';
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    const ext = extMap[mime.split(';')[0].trim()] ?? (extname(new URL(url).pathname).toLowerCase() || '.jpg');
    const filename = `imported-${randomUUID()}${ext}`;
    await writeFile(join(uploadsDir, filename), Buffer.from(await res.arrayBuffer()));
    return filename;
  } catch {
    return undefined;
  }
}

/** Extract text and optional image from a JSON-LD HowToStep, string, or array */
function extractStepData(step: unknown): { text: string; externalImageUrl?: string } {
  if (typeof step === 'string') return { text: step };
  if (step && typeof step === 'object') {
    const s = step as Record<string, unknown>;
    const text = typeof s.text === 'string' ? s.text : typeof s.name === 'string' ? s.name : '';
    return { text, externalImageUrl: extractImageUrl(s.image) };
  }
  return { text: '' };
}

/** Escape special regex characters in a user-provided string */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Return true if the resolved IP is not a private/internal address */
function isPrivateIp(ip: string): boolean {
  const h = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '0.0.0.0') return true;
  if (h === '127.0.0.1' || /^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (h === '::1' || h === '0:0:0:0:0:0:0:1') return true;
  if (/^f[cd]/i.test(h)) return true;
  if (h === '169.254.169.254') return true;
  return false;
}

/**
 * Resolve hostname to IP and verify it is not a private/internal address.
 * Resolving before checking prevents DNS rebinding attacks where a hostname
 * passes the pattern check but later resolves to a private IP.
 */
async function isSsrfSafe(urlString: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  try {
    const { address } = await lookup(hostname);
    return !isPrivateIp(address);
  } catch {
    return false; // unresolvable hostname → reject
  }
}

const CYRILLIC: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'j',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};
function makeSlug(title: string): string {
  return (
    title
      .slice(0, 200) // bound input length to prevent ReDoS on repeated special chars
      .toLowerCase()
      .split('')
      .map((c) => CYRILLIC[c] ?? c)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '') || 'recipe'
  );
}

@Injectable()
export class RecipesService implements OnModuleInit {
  constructor(
    @InjectModel(Recipe.name) private model: Model<RecipeDocument>,
    private uploads: UploadsService,
  ) {}

  async onModuleInit() {
    const recipes = await this.model.find({ slug: { $exists: false } }, { _id: 1, title: 1 }).lean();
    for (const r of recipes) {
      const slug = await this.generateUniqueSlug(r.title, r._id.toString());
      await this.model.updateOne({ _id: r._id }, { $set: { slug } });
    }
  }

  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = makeSlug(title);
    let slug = base;
    let n = 1;
    while (true) {
      const filter: Record<string, unknown> = { slug };
      if (excludeId) filter._id = { $ne: new Types.ObjectId(excludeId) };
      if (!(await this.model.exists(filter))) return slug;
      slug = `${base}-${++n}`;
    }
  }

  private findDocByIdOrSlug(idOrSlug: string) {
    return /^[0-9a-f]{24}$/i.test(idOrSlug) ? this.model.findById(idOrSlug) : this.model.findOne({ slug: idOrSlug });
  }

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

    if (tag) filter.tags = String(tag);
    if (category) filter.categoryId = new Types.ObjectId(category);

    if (q) {
      const safeQ = escapeRegex(String(q));
      const searchOr = [
        { title: { $regex: safeQ, $options: 'i' } },
        { description: { $regex: safeQ, $options: 'i' } },
        { tags: { $regex: safeQ, $options: 'i' } },
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
    const recipe = await (/^[0-9a-f]{24}$/i.test(id)
      ? this.model.findById(id)
      : this.model.findOne({ slug: id })
    ).lean();
    if (!recipe) throw new NotFoundException('Recipe not found');
    const isOwner = !!userId && recipe.authorId.toString() === userId;
    if (!recipe.isPublic && !isOwner && !isAdmin) throw new ForbiddenException();
    return recipe;
  }

  async create(userId: string, dto: CreateRecipeDto) {
    const uploadsDir = join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

    // Main photo
    let photoUrl: string | undefined;
    if (dto.externalImageUrl) {
      const filename = await downloadImage(dto.externalImageUrl, uploadsDir);
      if (filename) photoUrl = this.uploads.buildPhotoUrl(filename);
    }

    // Step photos
    const stepsWithPhotos = await Promise.all(
      (dto.steps ?? []).map(async (step) => {
        const result: { order: number; text: string; photoUrl?: string } = {
          order: step.order,
          text: step.text,
        };
        if (step.externalImageUrl) {
          const filename = await downloadImage(step.externalImageUrl, uploadsDir);
          if (filename) result.photoUrl = this.uploads.buildPhotoUrl(filename);
        }
        return result;
      }),
    );

    const slug = await this.generateUniqueSlug(dto.title);
    return this.model.create({
      ...dto,
      slug,
      photoUrl,
      steps: stepsWithPhotos,
      authorId: new Types.ObjectId(userId),
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
    });
  }

  async update(id: string, userId: string, isAdmin: boolean, dto: Partial<CreateRecipeDto>) {
    const recipe = await this.findDocByIdOrSlug(id);
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
    const recipe = await this.findDocByIdOrSlug(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId && !isAdmin) throw new ForbiddenException();
    await recipe.deleteOne();
    return { deleted: true };
  }

  async setPhoto(id: string, userId: string, isAdmin: boolean, photoUrl: string) {
    const recipe = await this.findDocByIdOrSlug(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId && !isAdmin) throw new ForbiddenException();
    await this.uploads.deletePhoto(recipe.photoUrl);
    recipe.photoUrl = photoUrl;
    return recipe.save();
  }

  async findPublic(query: RecipeQueryDto) {
    const { q, tag, category, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = { isPublic: true };
    if (q) {
      const safeQ = escapeRegex(String(q));
      filter.$or = [
        { title: { $regex: safeQ, $options: 'i' } },
        { description: { $regex: safeQ, $options: 'i' } },
        { tags: { $regex: safeQ, $options: 'i' } },
      ];
    }
    if (tag) filter.tags = String(tag);
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
    const recipe = await this.findDocByIdOrSlug(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.authorId.toString() !== userId && !isAdmin) throw new ForbiddenException();
    const step = recipe.steps.find((s) => s.order === order);
    if (!step) throw new NotFoundException('Step not found');
    await this.uploads.deletePhoto(step.photoUrl as string | undefined);
    step.photoUrl = photoUrl;
    recipe.markModified('steps');
    return recipe.save();
  }

  async addFavorite(recipeId: string, userId: string) {
    const recipe = await this.findDocByIdOrSlug(recipeId);
    if (!recipe) throw new NotFoundException('Recipe not found');
    await this.model.updateOne({ _id: recipe._id }, { $addToSet: { savedBy: new Types.ObjectId(userId) } });
    return { saved: true };
  }

  async removeFavorite(recipeId: string, userId: string) {
    const recipe = await this.findDocByIdOrSlug(recipeId);
    if (!recipe) throw new NotFoundException('Recipe not found');
    await this.model.updateOne({ _id: recipe._id }, { $pull: { savedBy: new Types.ObjectId(userId) } });
    return { saved: false };
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

  async importFromUrl(url: string) {
    if (!(await isSsrfSafe(url))) {
      throw new BadRequestException('Invalid or disallowed URL');
    }

    let html: string;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Mise-Bot/1.0; recipe importer)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const ct = res.headers.get('content-type') ?? '';
      let charset = /charset=([\w-]+)/i.exec(ct)?.[1];
      if (!charset) {
        const peek = new TextDecoder('latin1').decode(new Uint8Array(buf, 0, 4096));
        charset = /<meta[^>]+charset=["']?\s*([\w-]+)/i.exec(peek)?.[1] ?? /charset=([\w-]+)/i.exec(peek)?.[1];
      }
      html = new TextDecoder(charset ?? 'utf-8', { fatal: false }).decode(buf);
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
            .map(extractStepData)
            .filter((s) => s.text)
            .map((s, i) => ({ order: i + 1, text: s.text, externalImageUrl: s.externalImageUrl }));

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
            prepTime: obj.prepTime != null ? parseDuration(obj.prepTime as string | number) : undefined,
            cookTime: obj.cookTime != null ? parseDuration(obj.cookTime as string | number) : undefined,
            ingredients,
            steps,
            tags,
            externalImageUrl: extractImageUrl(obj.image),
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
    const ogImage = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
    const pageTitle = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim();

    if (ogTitle ?? pageTitle) {
      return {
        title: (ogTitle ?? pageTitle ?? 'Imported recipe').trim(),
        description: ogDesc?.trim(),
        externalImageUrl: ogImage ?? undefined,
      };
    }

    throw new BadRequestException('No recipe data found on this page');
  }
}
