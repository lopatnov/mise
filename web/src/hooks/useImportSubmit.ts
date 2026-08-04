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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? fallbackErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, handleSubmit };
}
