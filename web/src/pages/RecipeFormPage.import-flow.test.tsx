import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '../test-utils';

vi.mock('../api/categories', () => ({
  categoriesApi: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../api/recipes', () => ({
  recipesApi: {
    getTags: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    importFromUrl: vi.fn(),
    importFromText: vi.fn(),
  },
}));

const { default: RecipeFormPage } = await import('./RecipeFormPage');
const { recipesApi } = await import('../api/recipes');

const ziti = {
  title: 'Easy Baked Ziti',
  servings: 6,
  ingredients: [{ name: 'ziti pasta', amount: 1, unit: 'pound' }],
  steps: [{ order: 1, text: 'Boil the pasta.' }],
  externalImageUrl: 'https://img.example/ziti.jpg',
};
const soup = {
  title: 'Chicken And Gnocchi Soup',
  servings: 4,
  ingredients: [{ name: 'gnocchi', amount: 1, unit: 'pack' }],
  steps: [{ order: 1, text: 'Simmer the soup.' }],
};

// The real router, import dialog and form together: only the HTTP calls are mocked. The sibling
// RecipeFormPage.test.tsx stubs the router and the dialogs, which is how the leave-guard bug slipped through.
function renderApp() {
  const router = createMemoryRouter(
    [
      { path: '/recipes/new', element: <RecipeFormPage /> },
      { path: '/recipes/:slug', element: <Link to="/recipes/new">add recipe</Link> },
    ],
    { initialEntries: ['/recipes/new'] },
  );
  render(<RouterProvider router={router} />, { wrapper: createQueryWrapper() });
  return router;
}

async function importFrom(url: string) {
  await userEvent.click(screen.getByRole('button', { name: 'recipe.import.button' }));
  await userEvent.type(screen.getByPlaceholderText('recipe.import.urlPlaceholder'), url);
  await userEvent.click(screen.getByRole('button', { name: 'recipe.import.import' }));
}

const unsavedPrompt = () => screen.queryByText(/recipe\.form\.unsavedMessage/);
const titleField = () => screen.getByRole('textbox', { name: /recipe\.form\.titleLabel/i });

describe('recipe import → save → import again', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks keeps queued *Once values; drain them so one failing test cannot leak into the next.
    vi.mocked(recipesApi.importFromUrl).mockReset();
    vi.mocked(recipesApi.create).mockReset();
    vi.mocked(recipesApi.create).mockImplementation(
      async (data) =>
        ({
          _id: `id-${data.title}`,
          slug: String(data.title).toLowerCase().replaceAll(' ', '-'),
        }) as never,
    );
  });

  it('fills the form from the import, saves it, and lands on the recipe without an unsaved-changes prompt', async () => {
    vi.mocked(recipesApi.importFromUrl).mockResolvedValue(ziti as never);
    const router = renderApp();

    await importFrom('https://www.allrecipes.com/recipe/18031/baked-ziti-ii/');
    await waitFor(() => expect(titleField()).toHaveValue('Easy Baked Ziti'));
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.create' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/recipes/easy-baked-ziti'));
    expect(unsavedPrompt()).not.toBeInTheDocument();
    expect(recipesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Easy Baked Ziti', externalImageUrl: 'https://img.example/ziti.jpg' }),
    );
  });

  it('imports a second recipe after saving the first, and saves that one too', async () => {
    vi.mocked(recipesApi.importFromUrl)
      .mockResolvedValueOnce(ziti as never)
      .mockResolvedValueOnce(soup as never);
    const router = renderApp();

    await importFrom('https://www.allrecipes.com/recipe/18031/baked-ziti-ii/');
    await waitFor(() => expect(titleField()).toHaveValue('Easy Baked Ziti'));
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.create' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/recipes/easy-baked-ziti'));

    await userEvent.click(screen.getByRole('link', { name: 'add recipe' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/recipes/new'));
    expect(titleField()).toHaveValue('');

    await importFrom('https://www.allrecipes.com/recipe/218794/chicken-and-gnocchi-soup/');
    await waitFor(() => expect(titleField()).toHaveValue('Chicken And Gnocchi Soup'));
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.create' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/recipes/chicken-and-gnocchi-soup'));
    expect(unsavedPrompt()).not.toBeInTheDocument();
    expect(recipesApi.importFromUrl).toHaveBeenCalledTimes(2);
  });

  it('shows the server error when an import fails, then lets the same dialog retry successfully', async () => {
    vi.mocked(recipesApi.importFromUrl)
      .mockRejectedValueOnce({ response: { data: { message: 'Failed to fetch URL: HTTP 403' } } })
      .mockResolvedValueOnce(soup as never);
    renderApp();

    await importFrom('https://www.allrecipes.com/recipe/218794/chicken-and-gnocchi-soup/');
    expect(await screen.findByText('Failed to fetch URL: HTTP 403')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'recipe.import.import' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'recipe.import.import' }));

    await waitFor(() => expect(titleField()).toHaveValue('Chicken And Gnocchi Soup'));
    expect(screen.queryByText('Failed to fetch URL: HTTP 403')).not.toBeInTheDocument();
  });

  it("does not attach the first import's photo to a second import that has none", async () => {
    vi.mocked(recipesApi.importFromUrl)
      .mockResolvedValueOnce(ziti as never)
      .mockResolvedValueOnce(soup as never);
    renderApp();

    await importFrom('https://example.test/ziti');
    await waitFor(() => expect(titleField()).toHaveValue('Easy Baked Ziti'));
    await importFrom('https://example.test/soup');
    await waitFor(() => expect(titleField()).toHaveValue('Chicken And Gnocchi Soup'));
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.create' }));

    await waitFor(() => expect(recipesApi.create).toHaveBeenCalled());
    expect(vi.mocked(recipesApi.create).mock.calls[0][0].externalImageUrl).toBeUndefined();
  });

  it('still asks before leaving when the form has edits that were never saved', async () => {
    const router = renderApp();

    await userEvent.type(titleField(), 'Half-typed');
    await act(async () => {
      await router.navigate('/recipes/elsewhere');
    });

    expect(await screen.findByText(/recipe\.form\.unsavedMessage/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/recipes/new');
  });
});
