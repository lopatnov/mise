/**
 * Pure parsing helpers for recipe import — turn an external HTML page into recipe data.
 * No I/O here: everything takes strings/objects, so each step is unit-testable on its own.
 * Fetching the page is RecipeImportService's job.
 */

/** Recipe data scraped from an external page — returned to the client for editing, never saved as is */
export interface ImportedRecipe {
  title: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients?: { name: string; amount: number; unit: string }[];
  steps?: { order: number; text: string; externalImageUrl?: string }[];
  tags?: string[];
  externalImageUrl?: string;
}

/** Parse duration in various formats → minutes */
export function parseDuration(raw: string | number): number | undefined {
  if (typeof raw === 'number') return raw > 0 ? Math.round(raw) : undefined;
  const s = raw.trim();
  // ISO 8601: PT30M, PT1H30M, P0DT30M
  if (/^P/i.test(s)) {
    const h = /(\d+)H/i.exec(s);
    const m = /(\d+)M/i.exec(s);
    const total = Number.parseInt(h?.[1] ?? '0', 10) * 60 + Number.parseInt(m?.[1] ?? '0', 10);
    return total > 0 ? total : undefined;
  }
  // "H:MM" / "HH:MM"
  const hm = /^(\d+):(\d{2})$/.exec(s);
  if (hm) return Number.parseInt(hm[1], 10) * 60 + Number.parseInt(hm[2], 10) || undefined;
  // Plain number — assume minutes
  if (/^\d+$/.test(s)) return Number.parseInt(s, 10) || undefined;
  // "X hour(s) Y min(utes)" in various languages
  const hourMatch = /(\d+)\s*(?:h(?:r|rs|ours?)?|час)/i.exec(s);
  const minMatch = /(\d+)\s*(?:m(?:in(?:utes?)?)?(?!\w)|мин)/i.exec(s);
  if (hourMatch ?? minMatch) {
    const total = Number.parseInt(hourMatch?.[1] ?? '0', 10) * 60 + Number.parseInt(minMatch?.[1] ?? '0', 10);
    return total > 0 ? total : undefined;
  }
  // Last resort: first number in string → assume minutes
  const first = /(\d+)/.exec(s);
  return first ? Number.parseInt(first[1], 10) || undefined : undefined;
}

/** Parse first integer from a string (e.g. "4 servings" → 4, "Makes 4 to 6" → 4) */
export function parseServings(raw: string | number | undefined): number | undefined {
  if (typeof raw === 'number') return raw > 0 ? raw : undefined;
  if (!raw) return undefined;
  const m = /(\d+)/.exec(String(raw));
  return m ? Number.parseInt(m[1], 10) : undefined;
}

/** Parse ingredient string into name/amount/unit */
export function parseIngredient(raw: string): { name: string; amount: number; unit: string } {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  const normNum = (s: string) => Number.parseFloat(s.replace(',', '.'));
  // Match patterns like "1 1/2 cups", "2.5 grams", "2,5 гр", "1/3 cup", "3 large"
  const m = /^(\d+(?:[.,/]\d+)?(?:\s+\d+\/\d+)?)\s+([a-zA-Z\u0400-\u04ff]+(?:\s+[a-zA-Z\u0400-\u04ff]+)??)\s+(.+)/.exec(
    cleaned,
  );
  if (m) {
    const amountStr = m[1].includes('/')
      ? m[1].replace(/(\d+)\s+(\d+)\/(\d+)/, (_, w, n, d) =>
          String(Number.parseInt(w, 10) + Number.parseInt(n, 10) / Number.parseInt(d, 10)),
        )
      : m[1];
    return { amount: normNum(amountStr) || 1, unit: m[2], name: m[3] };
  }
  // Just a number + name (e.g. "2 eggs", "2,5 стакана")
  const m2 = /^(\d+(?:[.,]\d+)?)\s+(.+)/.exec(cleaned);
  if (m2) return { amount: normNum(m2[1]), unit: '', name: m2[2] };
  return { amount: 1, unit: '', name: cleaned };
}

/** Turn user-pasted plain text into structured ingredients/steps — one item per non-empty line */
export function parseTextImport(ingredientsText: string, stepsText: string): ImportedRecipe {
  return {
    title: '',
    ingredients: splitLines(ingredientsText).map(parseIngredient),
    steps: splitLines(stepsText).map((text, i) => ({ order: i + 1, text })),
  };
}

/** Split pasted text into non-empty lines, stripping common list markers ("-", "*", "•", "1.", "1)") */
function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

/** Extract image URL from JSON-LD image field (string, array, or ImageObject) */
export function extractImageUrl(raw: unknown): string | undefined {
  if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) return raw;
  if (Array.isArray(raw) && raw.length > 0) return extractImageUrl(raw[0]);
  if (raw && typeof raw === 'object') {
    const url = (raw as Record<string, unknown>).url;
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url;
  }
  return undefined;
}

/** Extract text and optional image from a JSON-LD HowToStep or plain string */
export function extractStepData(step: unknown): { text: string; externalImageUrl?: string } {
  if (typeof step === 'string') return { text: step };
  if (step && typeof step === 'object') {
    const s = step as Record<string, unknown>;
    const text = typeof s.text === 'string' ? s.text : typeof s.name === 'string' ? s.name : '';
    return { text, externalImageUrl: extractImageUrl(s.image) };
  }
  return { text: '' };
}

/** Recipe data from a JSON-LD node, or Open Graph / <title> meta tags as a fallback */
export function extractRecipeFromHtml(html: string): ImportedRecipe | null {
  return extractFromJsonLd(html) ?? extractFromMetaTags(html);
}

function extractFromJsonLd(html: string): ImportedRecipe | null {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    try {
      const raw: unknown = JSON.parse(block[1]);
      for (const node of jsonLdNodes(raw)) {
        if (isRecipeNode(node)) return recipeFromJsonLdNode(node);
      }
    } catch {
      // Malformed JSON-LD — try next block
    }
  }
  return null;
}

/** Flatten a JSON-LD document into the nodes it may contain (plain object, array, or @graph) */
function jsonLdNodes(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const graph = (raw as Record<string, unknown>)?.['@graph'];
  return graph ? (graph as unknown[]) : [raw];
}

function isRecipeNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== 'object') return false;
  const type = (node as Record<string, unknown>)['@type'];
  return type === 'Recipe' || (Array.isArray(type) && (type as string[]).includes('Recipe'));
}

function recipeFromJsonLdNode(obj: Record<string, unknown>): ImportedRecipe {
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
  const ingredients = (Array.isArray(rawIngredients) ? rawIngredients : []).map((r) => parseIngredient(String(r)));

  const keywordsRaw = obj.keywords;
  const keywordList = Array.isArray(keywordsRaw)
    ? keywordsRaw.map((k) => String(k))
    : typeof keywordsRaw === 'string'
      ? keywordsRaw.split(/[,;]/)
      : [];
  const tags = keywordList.map((t) => t.trim()).filter(Boolean);

  return {
    title: (typeof obj.name === 'string' ? obj.name.trim() : '') || 'Imported recipe',
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

/** Decode the HTML entities that commonly show up in scraped meta tag/title content */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(
      /&(?:lt|gt|quot|apos|nbsp);/g,
      (entity) => ({ '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[entity] as string,
    )
    .replace(/&amp;/g, '&');
}

/** Read a <meta> tag's content regardless of whether property/name comes before or after content */
function metaContent(html: string, attr: 'property' | 'name', value: string): string | undefined {
  const key = new RegExp(`${attr}=["']${value}["']`, 'i');
  for (const tag of html.matchAll(/<meta\s[^>]*>/gi)) {
    if (!key.test(tag[0])) continue;
    const content = /content=["']([^"']*)["']/i.exec(tag[0])?.[1];
    if (content !== undefined) return decodeHtmlEntities(content);
  }
  return undefined;
}

function extractFromMetaTags(html: string): ImportedRecipe | null {
  const ogTitle = metaContent(html, 'property', 'og:title');
  const ogDesc = metaContent(html, 'property', 'og:description') ?? metaContent(html, 'name', 'description');
  const ogImage = metaContent(html, 'property', 'og:image');
  const pageTitle = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim();
  const pageTitleDecoded = pageTitle ? decodeHtmlEntities(pageTitle) : undefined;

  if (!(ogTitle ?? pageTitleDecoded)) return null;
  return {
    title: (ogTitle ?? pageTitleDecoded ?? 'Imported recipe').trim(),
    description: ogDesc?.trim(),
    externalImageUrl: ogImage ?? undefined,
  };
}
