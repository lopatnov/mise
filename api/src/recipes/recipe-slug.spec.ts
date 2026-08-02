import { makeSlug } from './recipe-slug';

describe('makeSlug', () => {
  it('lowercases and joins words with dashes', () => {
    expect(makeSlug('Chocolate Chip Cookies')).toBe('chocolate-chip-cookies');
  });

  it('transliterates Cyrillic titles', () => {
    expect(makeSlug('Борщ')).toBe('borshch');
    expect(makeSlug('Щи из щавеля')).toBe('shchi-iz-shchavelya');
  });

  it('drops punctuation and collapses separators', () => {
    expect(makeSlug('Mom&#39;s  best -- pie!!!')).toBe('mom-39-s-best-pie');
    expect(makeSlug('  spaced  out  ')).toBe('spaced-out');
  });

  it('keeps digits', () => {
    expect(makeSlug('Top 10 salads')).toBe('top-10-salads');
  });

  it('falls back to "recipe" when nothing usable is left', () => {
    expect(makeSlug('!!!')).toBe('recipe');
    expect(makeSlug('')).toBe('recipe');
    expect(makeSlug('🍕')).toBe('recipe');
  });

  it('bounds very long titles', () => {
    expect(makeSlug('a'.repeat(500))).toHaveLength(200);
  });
});
