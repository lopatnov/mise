import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

/**
 * A React Query wrapper for `render(ui, { wrapper: QueryWrapper })`. Each mounted tree gets its own client, so no
 * cached data leaks between tests and failed queries do not retry.
 */
export function QueryWrapper({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
