import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../api/recipes';
import { recipesApi } from '../api/recipes';

interface ImportTextDialogProps {
  onImport: (data: Partial<Recipe>) => void;
  onClose: () => void;
}

export default function ImportTextDialog({ onImport, onClose }: ImportTextDialogProps) {
  const { t } = useTranslation();
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await recipesApi.importFromText(ingredientsText, stepsText);
      onImport(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('recipe.import.textError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="confirm-overlay">
      <button
        type="button"
        className="confirm-overlay__backdrop"
        onClick={onClose}
        tabIndex={-1}
        aria-label={t('recipe.import.cancel')}
      />
      <div role="dialog" aria-modal="true" className="confirm-dialog confirm-dialog--wide">
        <h2 className="import-dialog__title">{t('recipe.import.textTitle')}</h2>
        <p className="import-dialog__hint">{t('recipe.import.textHint')}</p>
        <form onSubmit={handleSubmit} className="import-dialog__form">
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
          {error && <p className="form-error">{error}</p>}
          <div className="confirm-dialog__actions">
            <button type="button" onClick={onClose} className="outline">
              {t('recipe.import.cancel')}
            </button>
            <button type="submit" disabled={loading || (!ingredientsText.trim() && !stepsText.trim())}>
              {loading ? t('recipe.import.importing') : t('recipe.import.import')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
