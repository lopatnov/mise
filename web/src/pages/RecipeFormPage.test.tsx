import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useParams: vi.fn(() => ({})),
  useBlocker: vi.fn(() => ({ state: 'unblocked' })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));

vi.mock('../api/categories', () => ({
  categoriesApi: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../api/recipes', () => ({
  recipesApi: {
    getTags: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ _id: 'new-id', slug: 'new-recipe' }),
    update: vi.fn().mockResolvedValue({ _id: 'edit-id', slug: 'edit-recipe' }),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../components/ImportUrlDialog', () => ({ default: () => null }));

// Lazy import after mocks are set up
const { default: RecipeFormPage } = await import('./RecipeFormPage');
const { useParams } = await import('react-router-dom');

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderPage() {
  return render(<RecipeFormPage />, { wrapper: Wrapper });
}

describe('RecipeFormPage — create mode', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({});
  });

  it('renders the new recipe heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('recipe.form.newTitle');
  });

  it('shows the import URL button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'recipe.import.button' })).toBeInTheDocument();
  });

  it('has a Create button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'recipe.form.create' })).toBeInTheDocument();
  });

  it('has a title input', () => {
    renderPage();
    expect(screen.getByTitle('recipe.form.titleLabel')).toBeInTheDocument();
  });

  it('adds an ingredient row when clicking Add', async () => {
    renderPage();
    const before = screen.getAllByLabelText('recipe.form.ingredientName').length;
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.addIngredient' }));
    expect(screen.getAllByLabelText('recipe.form.ingredientName')).toHaveLength(before + 1);
  });

  it('removes an ingredient row', async () => {
    renderPage();
    const before = screen.getAllByLabelText('recipe.form.ingredientName').length;
    await userEvent.click(screen.getAllByRole('button', { name: /recipe.form.removeIngredient/ })[0]);
    expect(screen.queryAllByLabelText('recipe.form.ingredientName')).toHaveLength(before - 1);
  });

  it('adds a step row when clicking Add', async () => {
    renderPage();
    const before = screen.getAllByLabelText(/recipe\.form\.step/).length;
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.addStep' }));
    expect(screen.getAllByLabelText(/recipe\.form\.step/)).toHaveLength(before + 1);
  });

  it('removes a step row', async () => {
    renderPage();
    const before = screen.getAllByLabelText(/recipe\.form\.step/).length;
    await userEvent.click(screen.getAllByRole('button', { name: /recipe.form.removeStep/ })[0]);
    expect(screen.queryAllByLabelText(/recipe\.form\.step/)).toHaveLength(before - 1);
  });
});

describe('RecipeFormPage — edit mode', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ id: 'abc123' });
  });

  it('renders the edit heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('recipe.form.editTitle');
  });

  it('does not show the import URL button', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: 'recipe.import.button' })).not.toBeInTheDocument();
  });

  it('shows a Save button instead of Create', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'recipe.form.save' })).toBeInTheDocument();
  });
});
