import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface IngredientRow {
  _id: string;
  name: string;
  amount: number;
  unit: string;
}

export function newIngredientRow(): IngredientRow {
  return { _id: crypto.randomUUID(), name: '', amount: 1, unit: '' };
}

/** Editable, drag-reorderable list of recipe ingredients. The list itself is owned by the form. */
export default function IngredientsEditor({
  ingredients,
  onChange,
}: {
  ingredients: IngredientRow[];
  onChange: (next: IngredientRow[]) => void;
}) {
  const { t } = useTranslation();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const add = () => onChange([...ingredients, newIngredientRow()]);
  const remove = (i: number) => onChange(ingredients.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<IngredientRow>) =>
    onChange(ingredients.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)));

  function move(from: number, to: number) {
    if (from === to) return;
    const next = [...ingredients];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <fieldset>
      <legend className="field__label">{t('recipe.form.ingredients')}</legend>
      <ol className="drag-list">
        {ingredients.map((ing, i) => (
          <li
            key={ing._id}
            className={`ingredient-row${dragIndex === i ? ' is-dragging' : ''}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            <span className="drag-handle" aria-hidden="true">
              ⠿
            </span>
            <input
              aria-label={t('recipe.form.ingredientName')}
              placeholder={t('recipe.form.ingredientName')}
              value={ing.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="ingredient-name"
            />
            <input
              type="number"
              aria-label={t('recipe.form.ingredientQty')}
              placeholder={t('recipe.form.ingredientQty')}
              value={ing.amount}
              onChange={(e) => update(i, { amount: Number(e.target.value) })}
            />
            <input
              aria-label={t('recipe.form.ingredientUnit')}
              placeholder={t('recipe.form.ingredientUnit')}
              value={ing.unit}
              onChange={(e) => update(i, { unit: e.target.value })}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="btn-remove"
              aria-label={t('recipe.form.removeIngredient', { n: i + 1 })}
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
        aria-label={t('recipe.form.addIngredient')}
      >
        {t('recipe.form.add')}
      </button>
    </fieldset>
  );
}
