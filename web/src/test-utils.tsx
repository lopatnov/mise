import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import type { Recipe } from './api/recipes';

/**
 * A React Query wrapper for `render(ui, { wrapper: QueryWrapper })`. Each mounted tree gets its own client, so no
 * cached data leaks between tests and failed queries do not retry.
 */
export function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** A minimal valid recipe for tests; pass overrides for the fields a test cares about. */
export function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
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
