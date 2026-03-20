import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../api/recipes';
import { recipesApi } from '../api/recipes';

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
    <div className="confirm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="import-dialog__title">{t('recipe.import.title')}</h2>
        <p className="import-dialog__hint">{t('recipe.import.hint')}</p>
        <form onSubmit={handleSubmit} className="import-dialog__form">
          <input
            type="url"
            id="import-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/recipe/..."
            required
            autoFocus
            className="form-input"
          />
          {error && <p className="form-error">{error}</p>}
          <div className="confirm-dialog__actions">
            <button type="button" onClick={onClose} className="btn btn--outline">
              {t('recipe.import.cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn btn--primary">
              {loading ? t('recipe.import.importing') : t('recipe.import.import')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
