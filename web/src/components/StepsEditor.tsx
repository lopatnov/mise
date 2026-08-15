import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface StepRow {
  _id: string;
  text: string;
  externalImageUrl: string;
}

export function newStepRow(): StepRow {
  return { _id: crypto.randomUUID(), text: '', externalImageUrl: '' };
}

/** Editable, drag-reorderable list of recipe steps. The list itself is owned by the form. */
export default function StepsEditor({ steps, onChange }: { steps: StepRow[]; onChange: (next: StepRow[]) => void }) {
  const { t } = useTranslation();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const add = () => onChange([...steps, newStepRow()]);
  const remove = (i: number) => onChange(steps.filter((_, idx) => idx !== i));
  const update = (i: number, text: string) => onChange(steps.map((s, idx) => (idx === i ? { ...s, text } : s)));

  function move(from: number, to: number) {
    if (from === to) return;
    const next = [...steps];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <fieldset>
      <legend className="field__label">{t('recipe.form.steps')}</legend>
      <ol className="drag-list">
        {steps.map((step, i) => (
          <li
            key={step._id}
            className={`step-row${dragIndex === i ? ' is-dragging' : ''}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            <span className="drag-handle drag-handle--top" aria-hidden="true">
              ⠿
            </span>
            <div className="step-content">
              <span className="step-number" aria-hidden="true">
                {i + 1}.
              </span>
              <textarea
                aria-label={t('recipe.form.step', { n: i + 1 })}
                value={step.text}
                onChange={(e) => update(i, e.target.value)}
                rows={2}
                placeholder={t('recipe.form.step', { n: i + 1 })}
                className="resize-v flex-1"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="btn-remove"
              aria-label={t('recipe.form.removeStep', { n: i + 1 })}
            >
              ×
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={add}
        className="secondary outline btn-sm btn-list-add"
        aria-label={t('recipe.form.addStep')}
      >
        {t('recipe.form.add')}
      </button>
    </fieldset>
  );
}
