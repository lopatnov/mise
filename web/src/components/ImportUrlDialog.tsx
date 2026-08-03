import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../api/recipes';
import { recipesApi } from '../api/recipes';
import ImportDialogShell from './ImportDialogShell';

interface ImportUrlDialogProps {
  onImport: (data: Partial<Recipe>) => void;
  onClose: () => void;
}

export default function ImportUrlDialog({ onImport, onClose }: ImportUrlDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await recipesApi.importFromUrl(url.trim());
      onImport(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('recipe.import.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImportDialogShell
      title={t('recipe.import.title')}
      hint={t('recipe.import.hint')}
      onSubmit={handleSubmit}
      onClose={onClose}
      loading={loading}
      loadingLabel={t('recipe.import.importing')}
      submitLabel={t('recipe.import.import')}
      cancelLabel={t('recipe.import.cancel')}
      error={error}
    >
      <input
        type="url"
        id="import-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/recipe/..."
        required
      />
    </ImportDialogShell>
  );
}
