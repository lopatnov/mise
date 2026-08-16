import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recipe } from '../api/recipes';

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

vi.mock('../components/ImportUrlDialog', () => ({
  default: ({ onImport }: { onImport: (data: unknown) => void }) => (
    <button type="button" onClick={() => onImport({ title: 'Imported' })}>
      mock-import-url-success
    </button>
  ),
}));
vi.mock('../components/ImportTextDialog', () => ({
  default: ({ onImport }: { onImport: (data: unknown) => void }) => (
    <button type="button" onClick={() => onImport({ title: 'Imported' })}>
      mock-import-text-success
    </button>
  ),
}));

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

  it('shows the import from text button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'recipe.import.textButton' })).toBeInTheDocument();
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

  it('closes the text-import dialog after a successful import', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'recipe.import.textButton' }));
    await userEvent.click(screen.getByRole('button', { name: 'mock-import-text-success' }));
    expect(screen.queryByRole('button', { name: 'mock-import-text-success' })).not.toBeInTheDocument();
  });

  it('closes the URL-import dialog after a successful import', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'recipe.import.button' }));
    await userEvent.click(screen.getByRole('button', { name: 'mock-import-url-success' }));
    expect(screen.queryByRole('button', { name: 'mock-import-url-success' })).not.toBeInTheDocument();
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

  it('does not show the import from text button', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: 'recipe.import.textButton' })).not.toBeInTheDocument();
  });

  it('shows a Save button instead of Create', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'recipe.form.save' })).toBeInTheDocument();
  });

  it("keeps each step's original order as sourceOrder in the update payload after reordering, decoupled from its new position", async () => {
    const { recipesApi } = await import('../api/recipes');
    vi.mocked(recipesApi.get).mockResolvedValueOnce({
      _id: 'abc123',
      title: 'Soup',
      ingredients: [],
      steps: [
        { order: 1, text: 'Step one' },
        { order: 2, text: 'Step two' },
      ],
      tags: [],
      servings: 2,
      createdAt: new Date().toISOString(),
    } as unknown as Recipe);

    renderPage();

    // Wait for the existing recipe's steps to be seeded into the form.
    await screen.findByDisplayValue('Step one');

    // Drag the second step row above the first, swapping their positions.
    const rows = document.querySelectorAll('.step-row');
    fireEvent.dragStart(rows[1]);
    fireEvent.dragOver(rows[0]);
    fireEvent.drop(rows[0]);
    fireEvent.dragEnd(rows[1]);

    // The visible order is now reversed — confirms the drag actually reordered the rows.
    const reorderedTextareas = screen.getAllByLabelText(/recipe\.form\.step/) as HTMLTextAreaElement[];
    expect(reorderedTextareas[0]).toHaveValue('Step two');
    expect(reorderedTextareas[1]).toHaveValue('Step one');

    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.save' }));

    await waitFor(() => expect(recipesApi.update).toHaveBeenCalled());
    const [, payload] = vi.mocked(recipesApi.update).mock.calls[0];
    // Each step must carry the order it had *before* the edit (sourceOrder), not just its new
    // array position — without this, the server would hand each step the other's uploaded photo.
    expect(payload.steps).toEqual([
      { order: 1, text: 'Step two', externalImageUrl: undefined, sourceOrder: 2 },
      { order: 2, text: 'Step one', externalImageUrl: undefined, sourceOrder: 1 },
    ]);
  });
});
