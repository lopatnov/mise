import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Shared by every component test: the rest of the app is never exercised with real translations or a real
// document title, so tests assert on translation keys and stay independent of the locale files.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('./hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));

afterEach(() => {
  cleanup();
});
