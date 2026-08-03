import { BadRequestException, Injectable } from '@nestjs/common';
import { fetchPinned, isSsrfSafe } from '../common/safe-http';
import { extractRecipeFromHtml, type ImportedRecipe } from './recipe-import.parsers';

const USER_AGENT = 'Mozilla/5.0 (compatible; Mise-Bot/1.0; recipe importer)';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

/** Imports recipe data from an external page. Returns parsed data — saving it is the caller's job. */
@Injectable()
export class RecipeImportService {
  async importFromUrl(url: string): Promise<ImportedRecipe> {
    const html = await this.fetchHtml(url);
    const recipe = extractRecipeFromHtml(html);
    if (!recipe) throw new BadRequestException('No recipe data found on this page');
    return recipe;
  }

  /** Fetch a user-supplied URL (SSRF-safe) and decode it using the charset the page declares */
  private async fetchHtml(url: string): Promise<string> {
    const safe = await isSsrfSafe(url);
    if (!safe) throw new BadRequestException('Invalid or disallowed URL');

    try {
      const res = await fetchPinned(safe, {
        headers: { 'User-Agent': USER_AGENT },
        timeoutMs: FETCH_TIMEOUT_MS,
        maxBytes: MAX_HTML_BYTES,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.buffer();
      return decodeBody(buf, detectCharset(buf, res.getHeader('content-type')));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Failed to fetch URL: ${msg}`);
    }
  }
}

/** Charset from the Content-Type header, falling back to the <meta charset> in the first 4 KB */
function detectCharset(body: Buffer, contentType: string | undefined): string {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType ?? '')?.[1];
  if (fromHeader) return fromHeader;
  const peek = body.subarray(0, 4096).toString('latin1');
  return /<meta[^>]+charset=["']?\s*([\w-]+)/i.exec(peek)?.[1] ?? /charset=([\w-]+)/i.exec(peek)?.[1] ?? 'utf-8';
}

/** Decode with the declared charset, falling back to utf-8 for labels Node's TextDecoder doesn't support */
function decodeBody(body: Buffer, charset: string): string {
  try {
    return new TextDecoder(charset, { fatal: false }).decode(body);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(body);
  }
}
