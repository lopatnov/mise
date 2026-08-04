import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../api/recipes';
import { recipesApi } from '../api/recipes';
import { useImportSubmit } from '../hooks/useImportSubmit';
import ImportDialogShell from './ImportDialogShell';

interface ImportUrlDialogProps {
  onImport: (data: Partial<Recipe>) => void;
  onClose: () => void;
}

export default function ImportUrlDialog({ onImport, onClose }: ImportUrlDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const { loading, error, handleSubmit } = useImportSubmit(
    () => recipesApi.importFromUrl(url.trim()),
    onImport,
    t('recipe.import.error'),
  );

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
