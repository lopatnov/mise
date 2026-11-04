import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper, makeRecipe } from '../test-utils';

// The id in the URL: the recipe's _id in most tests, its slug where the difference matters
let mockRouteId = 'r1';
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useParams: () => ({ id: mockRouteId }),
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock('../hooks/useMetaTags', () => ({ useMetaTags: vi.fn() }));
vi.mock('../hooks/useStructuredData', () => ({ useStructuredData: vi.fn() }));

let mockUser: { id: string; role?: string } | null = null;
vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user: mockUser }) }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('../store/toastStore', () => ({ useToast: () => toast }));

vi.mock('../api/categories', () => ({ categoriesApi: { list: vi.fn().mockResolvedValue([]) } }));

const recipesApi = {
  get: vi.fn(),
  create: vi.fn(),
  addCookNote: vi.fn(),
  removeCookNote: vi.fn(),
  addFavorite: vi.fn(),
};
vi.mock('../api/recipes', () => ({ recipesApi }));

// Lazy import after mocks are set up
const { default: RecipeDetailPage } = await import('./RecipeDetailPage');

function renderPage() {
  return render(<RecipeDetailPage />, { wrapper: createQueryWrapper() });
}

describe('RecipeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockRouteId = 'r1';
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

    await waitFor(() => {
      expect(recipesApi.addCookNote).toHaveBeenCalledWith('r1', 'Great with extra lemon', undefined);
    });
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

    await waitFor(() => {
      expect(recipesApi.removeCookNote).toHaveBeenCalledWith('r1', 'n1');
    });
  });

  it('shows a newly added cook note when the recipe was opened by its slug', async () => {
    mockRouteId = 'borsch';
    mockUser = { id: 'author-1' };
    recipesApi.get.mockResolvedValueOnce(makeRecipe({ authorId: 'author-1', cookNotes: [] })).mockResolvedValue(
      makeRecipe({
        authorId: 'author-1',
        cookNotes: [{ _id: 'n1', text: 'Great with extra lemon', createdAt: '2024-01-01T00:00:00.000Z' }],
      }),
    );
    recipesApi.addCookNote.mockResolvedValue([]);

    renderPage();
    await userEvent.type(await screen.findByPlaceholderText('recipe.cookLog.placeholder'), 'Great with extra lemon');
    await userEvent.click(screen.getByRole('button', { name: 'recipe.cookLog.add' }));

    // The page caches the recipe under the slug while the cook log only knows its _id
    expect(await screen.findByText('Great with extra lemon')).toBeInTheDocument();
    expect(recipesApi.get).toHaveBeenLastCalledWith('borsch');
  });

  it('reports a failed favourite toggle as a general error, not as a failed delete', async () => {
    mockUser = { id: 'reader' };
    recipesApi.get.mockResolvedValue(makeRecipe({ authorId: 'author-1' }));
    recipesApi.addFavorite.mockRejectedValue(new Error('network down'));

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'recipe.detail.favorite' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('error.message'));
    expect(toast.error).not.toHaveBeenCalledWith('recipe.detail.deleteError');
  });

  it('pre-fills the edit form under the slug it navigates to after saving a copy', async () => {
    mockUser = { id: 'reader' };
    recipesApi.get.mockResolvedValue(makeRecipe({ authorId: 'author-1' }));
    const copy = makeRecipe({ _id: 'copy-id', slug: 'borsch-copy' });
    recipesApi.create.mockResolvedValue(copy);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <RecipeDetailPage />
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'recipe.detail.duplicate' }));

    // The edit page reads its recipe under the slug from the URL, so that is where the copy has to be cached
    await waitFor(() => expect(client.getQueryData(['recipe', 'borsch-copy'])).toEqual(copy));
  });

  it('shows no stray 0 for a zero prep or cook time', async () => {
    recipesApi.get.mockResolvedValue(makeRecipe({ prepTime: 0, cookTime: 0 }));

    const { container } = renderPage();
    await screen.findByText('Borsch');

    expect(container.querySelector('.recipe-meta')).toBeEmptyDOMElement();
  });

  it('offers the hidden photo file inputs only to someone who can edit the recipe', async () => {
    const recipe = makeRecipe({ authorId: 'author-1', steps: [{ order: 1, text: 'Chop' }] });
    recipesApi.get.mockResolvedValue(recipe);

    mockUser = { id: 'reader' };
    const reader = renderPage();
    await screen.findByText('Borsch');
    expect(screen.queryAllByLabelText('recipe.detail.changePhoto')).toHaveLength(0);
    reader.unmount();

    mockUser = { id: 'author-1' };
    renderPage();
    await screen.findByText('Borsch');
    // One for the main photo, one shared by the steps
    expect(screen.getAllByLabelText('recipe.detail.changePhoto')).toHaveLength(2);
  });
});
