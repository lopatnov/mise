import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recipe } from '../api/recipes';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useParams: vi.fn(() => ({ id: 'r1' })),
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));
vi.mock('../hooks/useMetaTags', () => ({ useMetaTags: vi.fn() }));
vi.mock('../hooks/useStructuredData', () => ({ useStructuredData: vi.fn() }));

vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user: null }) }));
vi.mock('../store/toastStore', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

vi.mock('../api/categories', () => ({ categoriesApi: { list: vi.fn().mockResolvedValue([]) } }));

const recipesApi = { get: vi.fn() };
vi.mock('../api/recipes', () => ({ recipesApi }));

// Lazy import after mocks are set up
const { default: RecipeDetailPage } = await import('./RecipeDetailPage');

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    _id: 'r1',
    title: 'Borsch',
    servings: 4,
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    ingredients: [],
    steps: [],
    ...overrides,
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<RecipeDetailPage />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
  });
}

describe('RecipeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders steps ordered by step order', async () => {
    recipesApi.get.mockResolvedValue(
      makeRecipe({
        steps: [
          { order: 3, text: 'Serve' },
          { order: 1, text: 'Chop' },
          { order: 2, text: 'Boil' },
        ],
      }),
    );

    renderPage();

    const steps = await screen.findAllByRole('listitem');
    expect(steps.map((li) => li.textContent)).toEqual(['Chop', 'Boil', 'Serve']);
  });

  it('does not reorder the cached recipe object while rendering', async () => {
    const steps = [
      { order: 2, text: 'Boil' },
      { order: 1, text: 'Chop' },
    ];
    recipesApi.get.mockResolvedValue(makeRecipe({ steps }));

    renderPage();
    await screen.findAllByRole('listitem');

    // The page must sort a copy — mutating query cache data during render is a side effect
    expect(steps.map((s) => s.order)).toEqual([2, 1]);
  });

  it('scales ingredient amounts to the selected servings', async () => {
    recipesApi.get.mockResolvedValue(
      makeRecipe({
        servings: 2,
        ingredients: [{ name: 'flour', amount: 100, unit: 'g' }],
      }),
    );

    renderPage();

    // Rendered twice — once for the screen sidebar, once for print
    const rows = await screen.findAllByText(/flour/);
    expect(rows[0].textContent).toContain('100 g');
  });

  it('renders ingredients that share a name as separate rows', async () => {
    recipesApi.get.mockResolvedValue(
      makeRecipe({
        ingredients: [
          { name: 'salt', amount: 1, unit: 'tsp' },
          { name: 'salt', amount: 2, unit: 'g' },
        ],
      }),
    );

    renderPage();

    const rows = await screen.findAllByText(/salt/);
    expect(rows).toHaveLength(4); // two ingredients × (sidebar + print)
  });
});
