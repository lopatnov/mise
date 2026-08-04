import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../api/recipes';
import { recipesApi } from '../api/recipes';
import { useImportSubmit } from '../hooks/useImportSubmit';
import ImportDialogShell from './ImportDialogShell';

interface ImportTextDialogProps {
  onImport: (data: Partial<Recipe>) => void;
  onClose: () => void;
}

export default function ImportTextDialog({ onImport, onClose }: ImportTextDialogProps) {
  const { t } = useTranslation();
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const { loading, error, handleSubmit } = useImportSubmit(
    () => recipesApi.importFromText(ingredientsText, stepsText),
    onImport,
    t('recipe.import.textError'),
  );

  return (
    <ImportDialogShell
      title={t('recipe.import.textTitle')}
      hint={t('recipe.import.textHint')}
      onSubmit={handleSubmit}
      onClose={onClose}
      loading={loading}
      loadingLabel={t('recipe.import.importing')}
      submitLabel={t('recipe.import.import')}
      cancelLabel={t('recipe.import.cancel')}
      submitDisabled={!ingredientsText.trim() && !stepsText.trim()}
      error={error}
      wide
    >
      <label htmlFor="import-text-ingredients">{t('recipe.import.ingredientsLabel')}</label>
      <textarea
        id="import-text-ingredients"
        value={ingredientsText}
        onChange={(e) => setIngredientsText(e.target.value)}
        placeholder={t('recipe.import.ingredientsPlaceholder')}
        rows={6}
      />
      <label htmlFor="import-text-steps">{t('recipe.import.stepsLabel')}</label>
      <textarea
        id="import-text-steps"
        value={stepsText}
        onChange={(e) => setStepsText(e.target.value)}
        placeholder={t('recipe.import.stepsPlaceholder')}
        rows={6}
      />
    </ImportDialogShell>
  );
}
