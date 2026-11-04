import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recipe } from '../api/recipes';
import { createQueryWrapper } from '../test-utils';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useParams: vi.fn(() => ({})),
  useBlocker: vi.fn(() => ({ state: 'unblocked' })),
}));

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
const { recipesApi } = await import('../api/recipes');
const { categoriesApi } = await import('../api/categories');

function renderPage() {
  return render(<RecipeFormPage />, { wrapper: createQueryWrapper() });
}

describe('RecipeFormPage — create mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('leaves optional fields that were never filled in out of a new recipe', async () => {
    renderPage();
    await userEvent.type(screen.getByTitle('recipe.form.titleLabel'), 'Toast');
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.create' }));

    await waitFor(() => expect(recipesApi.create).toHaveBeenCalled());
    const [payload] = vi.mocked(recipesApi.create).mock.calls[0];
    for (const field of ['description', 'prepTime', 'cookTime', 'rating', 'categoryId'] as const) {
      expect(payload[field]).toBeUndefined();
    }
  });
});

describe('RecipeFormPage — edit mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('sends fields emptied while editing as null, so the update clears them instead of keeping the old values', async () => {
    vi.mocked(categoriesApi.list).mockResolvedValueOnce([{ _id: 'c1', name: 'Soup' }]);
    vi.mocked(recipesApi.get).mockResolvedValueOnce({
      _id: 'abc123',
      title: 'Soup',
      description: 'Old notes',
      prepTime: 10,
      cookTime: 20,
      rating: 4,
      categoryId: 'c1',
      ingredients: [],
      steps: [],
      tags: [],
      servings: 2,
      createdAt: new Date().toISOString(),
    });

    renderPage();
    await screen.findByDisplayValue('Old notes');
    await screen.findByRole('option', { name: /Soup/ });

    await userEvent.clear(screen.getByTitle('recipe.form.description'));
    await userEvent.clear(screen.getByTitle('recipe.form.prepTime'));
    await userEvent.clear(screen.getByTitle('recipe.form.rating'));
    await userEvent.selectOptions(screen.getByTitle('recipe.form.category'), '');
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.save' }));

    await waitFor(() => expect(recipesApi.update).toHaveBeenCalled());
    const [, payload] = vi.mocked(recipesApi.update).mock.calls[0];
    expect(payload).toMatchObject({ description: null, prepTime: null, rating: null, categoryId: null, cookTime: 20 });
  });

  /** Open the edit form for the recipe "soup" by its slug, then save it unchanged */
  async function saveEditOpenedBySlug() {
    vi.mocked(useParams).mockReturnValue({ id: 'soup' });
    vi.mocked(recipesApi.get).mockResolvedValueOnce({
      _id: 'r-1',
      slug: 'soup',
      title: 'Soup',
      ingredients: [],
      steps: [],
      tags: [],
      servings: 2,
      createdAt: new Date().toISOString(),
    });
    vi.mocked(recipesApi.update).mockResolvedValueOnce({ _id: 'r-1', slug: 'soup' } as Recipe);
    vi.mocked(recipesApi.getTags).mockClear();

    renderPage();
    await screen.findByDisplayValue('Soup');
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.save' }));
  }

  it('refreshes the recipe cached under its slug after saving an edit opened by that slug', async () => {
    await saveEditOpenedBySlug();

    // Without the refetch the recipe page, keyed by the slug, would keep showing the recipe as it was before the edit
    await waitFor(() => expect(recipesApi.get).toHaveBeenCalledTimes(2));
    expect(recipesApi.get).toHaveBeenLastCalledWith('soup');
  });

  it('refreshes the tag list after saving, so a tag added by this save is offered at once', async () => {
    await saveEditOpenedBySlug();

    // Once on mount, once more after the save invalidated it
    await waitFor(() => expect(recipesApi.getTags).toHaveBeenCalledTimes(2));
  });
});
