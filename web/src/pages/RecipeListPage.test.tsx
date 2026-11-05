import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recipe } from '../api/recipes';
import { makeRecipe, QueryWrapper } from '../test-utils';

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ token: null }) }));

vi.mock('../api/categories', () => ({
  categoriesApi: {
    list: vi.fn().mockResolvedValue([
      { _id: 'c-soup', name: 'Soup', slug: 'soup', icon: '🍜' },
      { _id: 'c-custom', name: 'Grandma favourites', icon: '👵' },
    ]),
  },
}));

const recipesApi = { listPublic: vi.fn(), getTags: vi.fn().mockResolvedValue([]) };
vi.mock('../api/recipes', () => ({ recipesApi }));

const { default: RecipeListPage } = await import('./RecipeListPage');

function renderWith(items: Recipe[]) {
  recipesApi.listPublic.mockResolvedValue({ items, total: items.length, page: 1, limit: 12 });
  return render(<RecipeListPage />, { wrapper: QueryWrapper });
}

describe('RecipeListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the total time on a card that has one', async () => {
    const { container } = renderWith([makeRecipe({ prepTime: 10, cookTime: 5 })]);
    await screen.findByText('Borsch');

    expect(container.querySelector('.card-time-badge')).toHaveTextContent('15');
  });

  it('shows no time badge and no stray 0 on a card whose only time is a zero cook time', async () => {
    const { container } = renderWith([makeRecipe({ cookTime: 0 })]);
    await screen.findByText('Borsch');

    expect(container.querySelector('.card-time-badge')).not.toBeInTheDocument();
    expect(container.querySelector('.recipe-card__photo-wrap')).toHaveTextContent(/^🍽$/);
  });

  it('labels a built-in category by its translation key and a custom one by its own name', async () => {
    const { container } = renderWith([
      makeRecipe({ _id: 'r1', title: 'Borsch', categoryId: 'c-soup' }),
      makeRecipe({ _id: 'r2', title: 'Pierogi', categoryId: 'c-custom' }),
    ]);
    await screen.findByText('Pierogi');

    // The test i18n mock returns the key itself, so a translated label shows up as its key
    await waitFor(() =>
      expect([...container.querySelectorAll('.recipe-card__category')].map((el) => el.textContent)).toEqual([
        '🍜 categories.soup',
        '👵 Grandma favourites',
      ]),
    );
  });
});
