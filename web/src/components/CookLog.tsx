import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CookNote } from '../api/recipes';
import { recipesApi } from '../api/recipes';
import { useToast } from '../store/toastStore';

interface CookLogProps {
  recipeId: string;
  notes: CookNote[];
}

/** Private per-recipe cooking notes — only ever rendered for the recipe's owner/admin, never on public views */
export default function CookLog({ recipeId, notes }: CookLogProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const [rating, setRating] = useState('');

  const addMut = useMutation({
    mutationFn: () => recipesApi.addCookNote(recipeId, text.trim(), rating ? Number(rating) : undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', recipeId] });
      setText('');
      setRating('');
    },
    onError: () => toast.error(t('recipe.cookLog.addError')),
  });

  const removeMut = useMutation({
    mutationFn: (noteId: string) => recipesApi.removeCookNote(recipeId, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipe', recipeId] }),
    onError: () => toast.error(t('recipe.cookLog.removeError')),
  });

  const orderedNotes = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <section className="recipe-section cook-log no-print">
      <h2 className="recipe-section__title">{t('recipe.cookLog.title')}</h2>
      <p className="cook-log__hint">{t('recipe.cookLog.hint')}</p>

      {orderedNotes.length > 0 && (
        <ul className="cook-log__list">
          {orderedNotes.map((note) => (
            <li key={note._id} className="cook-log__item">
              <div className="cook-log__item-header">
                <span className="cook-log__date">{new Date(note.createdAt).toLocaleDateString()}</span>
                {note.rating && <span className="cook-log__rating">{'⭐'.repeat(note.rating)}</span>}
                <button
                  type="button"
                  onClick={() => removeMut.mutate(note._id)}
                  disabled={removeMut.isPending}
                  className="btn-icon cook-log__remove"
                  aria-label={t('recipe.cookLog.remove')}
                >
                  ✕
                </button>
              </div>
              <p className="cook-log__text">{note.text}</p>
            </li>
          ))}
        </ul>
      )}

      <form
        className="cook-log__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) addMut.mutate();
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('recipe.cookLog.placeholder')}
          aria-label={t('recipe.cookLog.placeholder')}
          rows={2}
          className="resize-v"
        />
        <div className="cook-log__form-row">
          <select value={rating} onChange={(e) => setRating(e.target.value)} aria-label={t('recipe.cookLog.rating')}>
            <option value="">{t('recipe.cookLog.noRating')}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {'⭐'.repeat(n)}
              </option>
            ))}
          </select>
          <button type="submit" disabled={addMut.isPending || !text.trim()}>
            {t('recipe.cookLog.add')}
          </button>
        </div>
      </form>
    </section>
  );
}
