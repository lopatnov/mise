import {
  extractImageUrl,
  extractRecipeFromHtml,
  extractStepData,
  parseDuration,
  parseIngredient,
  parseServings,
} from './recipe-import.parsers';

describe('recipe import parsers', () => {
  // ── parseDuration ─────────────────────────────────────────────────────────

  describe('parseDuration', () => {
    it('parses ISO 8601 durations', () => {
      expect(parseDuration('PT30M')).toBe(30);
      expect(parseDuration('PT1H30M')).toBe(90);
      expect(parseDuration('P0DT45M')).toBe(45);
    });

    it('parses H:MM', () => {
      expect(parseDuration('1:30')).toBe(90);
      expect(parseDuration('0:20')).toBe(20);
    });

    it('treats a plain number as minutes', () => {
      expect(parseDuration('45')).toBe(45);
      expect(parseDuration(25)).toBe(25);
    });

    it('parses human text in English and Russian', () => {
      expect(parseDuration('about 20 minutes')).toBe(20);
      expect(parseDuration('1 hour 15 min')).toBe(75);
      expect(parseDuration('2 часа 10 мин')).toBe(130);
    });

    it('returns undefined for zero and unparseable values', () => {
      expect(parseDuration(0)).toBeUndefined();
      expect(parseDuration('PT0M')).toBeUndefined();
      expect(parseDuration('quick')).toBeUndefined();
    });
  });

  // ── parseServings ─────────────────────────────────────────────────────────

  describe('parseServings', () => {
    it('takes the first number it finds', () => {
      expect(parseServings('4 servings')).toBe(4);
      expect(parseServings('Makes 4 to 6')).toBe(4);
      expect(parseServings(6)).toBe(6);
    });

    it('returns undefined when there is nothing to parse', () => {
      expect(parseServings(undefined)).toBeUndefined();
      expect(parseServings('')).toBeUndefined();
      expect(parseServings('a lot')).toBeUndefined();
      expect(parseServings(0)).toBeUndefined();
    });
  });

  // ── parseIngredient ───────────────────────────────────────────────────────

  describe('parseIngredient', () => {
    it('splits amount, unit and name', () => {
      expect(parseIngredient('2.5 grams salt')).toEqual({ amount: 2.5, unit: 'grams', name: 'salt' });
      expect(parseIngredient('200 г муки')).toEqual({ amount: 200, unit: 'г', name: 'муки' });
    });

    it('understands mixed fractions', () => {
      expect(parseIngredient('1 1/2 cups flour')).toEqual({ amount: 1.5, unit: 'cups', name: 'flour' });
    });

    it('accepts a comma as the decimal separator', () => {
      expect(parseIngredient('2,5 стакана молока')).toEqual({ amount: 2.5, unit: 'стакана', name: 'молока' });
    });

    it('falls back to amount + name when there is no unit', () => {
      expect(parseIngredient('2 eggs')).toEqual({ amount: 2, unit: '', name: 'eggs' });
    });

    it('defaults to a single unnamed unit for a bare ingredient', () => {
      expect(parseIngredient('salt to taste')).toEqual({ amount: 1, unit: '', name: 'salt to taste' });
    });

    it('collapses repeated whitespace', () => {
      expect(parseIngredient('  3   large   eggs ')).toEqual({ amount: 3, unit: 'large', name: 'eggs' });
    });
  });

  // ── extractImageUrl ───────────────────────────────────────────────────────

  describe('extractImageUrl', () => {
    it('accepts a plain URL string', () => {
      expect(extractImageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    });

    it('takes the first entry of an array', () => {
      expect(extractImageUrl(['https://example.com/a.jpg', 'https://example.com/b.jpg'])).toBe(
        'https://example.com/a.jpg',
      );
    });

    it('reads the url field of an ImageObject', () => {
      expect(extractImageUrl({ '@type': 'ImageObject', url: 'https://example.com/c.jpg' })).toBe(
        'https://example.com/c.jpg',
      );
    });

    it('rejects non-http values', () => {
      expect(extractImageUrl('/relative.jpg')).toBeUndefined();
      expect(extractImageUrl(null)).toBeUndefined();
      expect(extractImageUrl({})).toBeUndefined();
    });
  });

  // ── extractStepData ───────────────────────────────────────────────────────

  describe('extractStepData', () => {
    it('reads a plain string step', () => {
      expect(extractStepData('Chop the onion')).toEqual({ text: 'Chop the onion' });
    });

    it('reads text and image from a HowToStep', () => {
      expect(extractStepData({ '@type': 'HowToStep', text: 'Fry', image: 'https://example.com/s.jpg' })).toEqual({
        text: 'Fry',
        externalImageUrl: 'https://example.com/s.jpg',
      });
    });

    it('falls back to name when text is missing', () => {
      expect(extractStepData({ name: 'Bake' })).toEqual({ text: 'Bake', externalImageUrl: undefined });
    });

    it('returns empty text for unusable input', () => {
      expect(extractStepData(42)).toEqual({ text: '' });
    });
  });

  // ── extractRecipeFromHtml ─────────────────────────────────────────────────

  describe('extractRecipeFromHtml', () => {
    const jsonLd = (payload: unknown) =>
      `<html><head><script type="application/ld+json">${JSON.stringify(payload)}</script></head></html>`;

    it('parses a JSON-LD Recipe node', () => {
      const html = jsonLd({
        '@type': 'Recipe',
        name: '  Borsch  ',
        description: 'Beetroot soup',
        recipeYield: '6 servings',
        prepTime: 'PT20M',
        cookTime: 'PT1H',
        recipeIngredient: ['2 eggs', '200 г муки'],
        recipeInstructions: ['Chop', { '@type': 'HowToStep', text: 'Boil' }],
        keywords: 'soup, dinner',
        image: 'https://example.com/borsch.jpg',
      });

      expect(extractRecipeFromHtml(html)).toEqual({
        title: 'Borsch',
        description: 'Beetroot soup',
        servings: 6,
        prepTime: 20,
        cookTime: 60,
        ingredients: [
          { amount: 2, unit: '', name: 'eggs' },
          { amount: 200, unit: 'г', name: 'муки' },
        ],
        steps: [
          { order: 1, text: 'Chop', externalImageUrl: undefined },
          { order: 2, text: 'Boil', externalImageUrl: undefined },
        ],
        tags: ['soup', 'dinner'],
        externalImageUrl: 'https://example.com/borsch.jpg',
      });
    });

    it('finds the Recipe inside an @graph document', () => {
      const html = jsonLd({ '@graph': [{ '@type': 'WebPage' }, { '@type': 'Recipe', name: 'Pasta' }] });
      expect(extractRecipeFromHtml(html)?.title).toBe('Pasta');
    });

    it('accepts an array @type containing Recipe', () => {
      const html = jsonLd([{ '@type': ['Thing', 'Recipe'], name: 'Soup' }]);
      expect(extractRecipeFromHtml(html)?.title).toBe('Soup');
    });

    it('skips malformed JSON-LD blocks and keeps looking', () => {
      const html = `<script type="application/ld+json">{ broken json </script>${jsonLd({
        '@type': 'Recipe',
        name: 'Pie',
      })}`;
      expect(extractRecipeFromHtml(html)?.title).toBe('Pie');
    });

    it('names an untitled recipe "Imported recipe"', () => {
      expect(extractRecipeFromHtml(jsonLd({ '@type': 'Recipe' }))?.title).toBe('Imported recipe');
    });

    it('falls back to Open Graph tags when there is no JSON-LD recipe', () => {
      const html = `<html><head>
        <meta property="og:title" content="Pancakes" />
        <meta property="og:description" content="Fluffy" />
        <meta property="og:image" content="https://example.com/p.jpg" />
      </head></html>`;

      expect(extractRecipeFromHtml(html)).toEqual({
        title: 'Pancakes',
        description: 'Fluffy',
        externalImageUrl: 'https://example.com/p.jpg',
      });
    });

    it('falls back to the page title when Open Graph is absent', () => {
      const html = '<html><head><title>  Grandma cake  </title></head></html>';
      expect(extractRecipeFromHtml(html)?.title).toBe('Grandma cake');
    });

    it('returns null when the page has no recipe data at all', () => {
      expect(extractRecipeFromHtml('<html><body>nothing here</body></html>')).toBeNull();
    });
  });
});
