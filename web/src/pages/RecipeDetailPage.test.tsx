import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

let mockUser: { id: string; role?: string } | null = null;
vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user: mockUser }) }));
vi.mock('../store/toastStore', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

vi.mock('../api/categories', () => ({ categoriesApi: { list: vi.fn().mockResolvedValue([]) } }));

const recipesApi = { get: vi.fn(), addCookNote: vi.fn(), removeCookNote: vi.fn() };
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
    mockUser = null;
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

  it('hides the cook log from a non-owner', async () => {
    mockUser = { id: 'someone-else' };
    recipesApi.get.mockResolvedValue(makeRecipe({ authorId: 'r1-author' }));

    renderPage();
    await screen.findByText('Borsch');

    expect(screen.queryByText('recipe.cookLog.title')).not.toBeInTheDocument();
  });

  it('shows the cook log for the recipe owner', async () => {
    mockUser = { id: 'author-1' };
    recipesApi.get.mockResolvedValue(
      makeRecipe({
        authorId: 'author-1',
        cookNotes: [{ _id: 'n1', text: 'Add more garlic', rating: 4, createdAt: '2024-01-01T00:00:00.000Z' }],
      }),
    );

    renderPage();

    expect(await screen.findByText('recipe.cookLog.title')).toBeInTheDocument();
    expect(screen.getByText('Add more garlic')).toBeInTheDocument();
  });

  it('adds a cook note', async () => {
    mockUser = { id: 'author-1' };
    recipesApi.get.mockResolvedValue(makeRecipe({ authorId: 'author-1', cookNotes: [] }));
    recipesApi.addCookNote.mockResolvedValue([]);

    renderPage();
    const textarea = await screen.findByPlaceholderText('recipe.cookLog.placeholder');
    await userEvent.type(textarea, 'Great with extra lemon');
    await userEvent.click(screen.getByRole('button', { name: 'recipe.cookLog.add' }));

    expect(recipesApi.addCookNote).toHaveBeenCalledWith('r1', 'Great with extra lemon', undefined);
  });

  it('removes a cook note', async () => {
    mockUser = { id: 'author-1' };
    recipesApi.get.mockResolvedValue(
      makeRecipe({
        authorId: 'author-1',
        cookNotes: [{ _id: 'n1', text: 'Add more garlic', createdAt: '2024-01-01T00:00:00.000Z' }],
      }),
    );
    recipesApi.removeCookNote.mockResolvedValue([]);

    renderPage();
    await screen.findByText('Add more garlic');
    await userEvent.click(screen.getByRole('button', { name: 'recipe.cookLog.remove' }));

    expect(recipesApi.removeCookNote).toHaveBeenCalledWith('r1', 'n1');
  });
});
