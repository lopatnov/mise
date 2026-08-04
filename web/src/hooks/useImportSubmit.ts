import { useState } from 'react';
import type { Recipe } from '../api/recipes';

/** Shared submit/loading/error handling for the recipe-import dialogs (URL, pasted text) */
export function useImportSubmit(
  runImport: () => Promise<Partial<Recipe>>,
  onImport: (data: Partial<Recipe>) => void,
  fallbackErrorMessage: string,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await runImport();
      onImport(data);
    } catch (err: unknown) {
      // class-validator's default ValidationPipe returns `message` as string[], not a string
      const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      const msg = Array.isArray(message)
        ? message.filter((item): item is string => typeof item === 'string').join(', ')
        : typeof message === 'string'
          ? message
          : undefined;
      setError(msg || fallbackErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, handleSubmit };
}
