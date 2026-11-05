import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Step } from '../api/recipes';
import HiddenPhotoInput from './HiddenPhotoInput';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface RecipeStepsProps {
  steps: Step[];
  canEdit: boolean;
  onPhotoSelected: (order: number, file: File) => void;
  onPhotoOpen: (src: string) => void;
}

/** The recipe's steps in order, each with its photo — an editor can add a photo to a step or replace it */
export default function RecipeSteps({ steps, canEdit, onPhotoSelected, onPhotoOpen }: Readonly<RecipeStepsProps>) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  // One hidden file input serves every step, so remember which step's button opened it
  const pendingOrder = useRef<number | null>(null);

  // Copy before sorting: steps come straight from the query cache and must not be mutated
  const orderedSteps = [...steps].sort((a, b) => a.order - b.order);
  if (orderedSteps.length === 0) return null;

  function pickPhoto(order: number) {
    pendingOrder.current = order;
    fileRef.current?.click();
  }

  return (
    <section className="recipe-section">
      <h2 className="recipe-section__title">{t('recipe.detail.steps')}</h2>
      <ol className="recipe-section__list">
        {orderedSteps.map((step, i) => (
          <li key={step.order} className="recipe-step__item">
            <div className="recipe-step__row">
              <span className="recipe-step__text">{step.text}</span>
              {canEdit && !step.photoUrl && (
                <button
                  type="button"
                  onClick={() => pickPhoto(step.order)}
                  title={t('recipe.detail.addPhoto')}
                  className="step-photo-add-btn"
                >
                  📷
                </button>
              )}
            </div>
            {step.photoUrl && (
              <div className="photo-container recipe-step__photo-container">
                <button
                  type="button"
                  className="photo-btn"
                  onClick={() => onPhotoOpen(`${API_URL}${step.photoUrl ?? ''}`)}
                  aria-label={t('recipe.form.step', { n: i + 1 })}
                >
                  <img src={`${API_URL}${step.photoUrl}`} alt="" className="recipe-step__photo" loading="lazy" />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      pickPhoto(step.order);
                    }}
                    title={t('recipe.detail.changePhoto')}
                    className="photo-replace-btn"
                  >
                    📷
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      {canEdit && (
        <HiddenPhotoInput
          inputRef={fileRef}
          onFile={(file) => {
            if (pendingOrder.current !== null) onPhotoSelected(pendingOrder.current, file);
          }}
        />
      )}
    </section>
  );
}
