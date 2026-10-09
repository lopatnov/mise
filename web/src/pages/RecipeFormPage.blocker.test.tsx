import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

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
    update: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
  },
}));

const { default: RecipeFormPage } = await import('./RecipeFormPage');

// The router is real on purpose: the sibling RecipeFormPage.test.tsx stubs useBlocker, which hides
// ordering bugs between clearing the dirty flag and navigating away after a successful save.
function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/recipes/new', element: <RecipeFormPage /> },
      { path: '/recipes/:slug', element: <p>recipe detail page</p> },
    ],
    { initialEntries: [path] },
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('RecipeFormPage — leaving after a successful save', () => {
  it('navigates to the saved recipe without the unsaved-changes prompt', async () => {
    const router = renderAt('/recipes/new');

    await userEvent.type(screen.getByRole('textbox', { name: /recipe\.form\.title/i }), 'Easy baked ziti');
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.create' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/recipes/new-recipe'));
    expect(screen.queryByText(/recipe\.form\.unsavedMessage/)).not.toBeInTheDocument();
    expect(screen.getByText('recipe detail page')).toBeInTheDocument();
  });

  it('still asks before leaving when the form has unsaved edits', async () => {
    const router = renderAt('/recipes/new');

    await userEvent.type(screen.getByRole('textbox', { name: /recipe\.form\.title/i }), 'Half-typed');
    await act(async () => {
      await router.navigate('/recipes/elsewhere');
    });

    expect(await screen.findByText(/recipe\.form\.unsavedMessage/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/recipes/new');
  });
});
