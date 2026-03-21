import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import type { Recipe } from '../api/recipes';
import { recipesApi } from '../api/recipes';
import ImportUrlDialog from '../components/ImportUrlDialog';
import { usePageTitle } from '../hooks/usePageTitle';

export default function RecipeFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  usePageTitle(isEdit ? t('recipe.form.editTitle') : t('recipe.form.newTitle'));
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(1);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [rating, setRating] = useState('');
  const [tags, setTags] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [ingredients, setIngredients] = useState([{ _id: crypto.randomUUID(), name: '', amount: 1, unit: '' }]);
  const [steps, setSteps] = useState([{ _id: crypto.randomUUID(), text: '', externalImageUrl: '' }]);
  const [dragIngIdx, setDragIngIdx] = useState<number | null>(null);
  const [dragStepIdx, setDragStepIdx] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importedImageUrl, setImportedImageUrl] = useState('');

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: allTags } = useQuery({ queryKey: ['recipe-tags'], queryFn: recipesApi.getTags });

  const { data: existing } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.get(id ?? ''),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? '');
      setServings(existing.servings);
      setPrepTime(existing.prepTime?.toString() ?? '');
      setCookTime(existing.cookTime?.toString() ?? '');
      setRating(existing.rating?.toString() ?? '');
      setTags(existing.tags.join(', '));
      setCategoryId(existing.categoryId ?? '');
      setIsPublic(existing.isPublic ?? false);
      if (existing.ingredients.length)
        setIngredients(existing.ingredients.map((ing) => ({ _id: crypto.randomUUID(), ...ing })));
      if (existing.steps.length)
        setSteps(existing.steps.map((s) => ({ _id: crypto.randomUUID(), text: s.text, externalImageUrl: '' })));
    }
  }, [existing]);

  function applyImport(data: Partial<Recipe>) {
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);
    if (data.servings) setServings(data.servings);
    if (data.prepTime) setPrepTime(String(data.prepTime));
    if (data.cookTime) setCookTime(String(data.cookTime));
    if (data.tags?.length) setTags(data.tags.join(', '));
    if (data.ingredients?.length) setIngredients(data.ingredients.map((ing) => ({ _id: crypto.randomUUID(), ...ing })));
    if (data.steps?.length)
      setSteps(
        data.steps.map((s) => ({ _id: crypto.randomUUID(), text: s.text, externalImageUrl: s.externalImageUrl ?? '' })),
      );
    if (data.externalImageUrl) setImportedImageUrl(data.externalImageUrl);
    setShowImport(false);
  }

  const saveMut = useMutation({
    mutationFn: (data: Partial<Recipe>) => (isEdit ? recipesApi.update(id ?? '', data) : recipesApi.create(data)),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe', saved._id] });
      navigate(`/recipes/${saved._id}`);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveMut.mutate({
      title,
      description: description || undefined,
      servings,
      prepTime: prepTime ? Number(prepTime) : undefined,
      cookTime: cookTime ? Number(cookTime) : undefined,
      rating: rating ? Number(rating) : undefined,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      categoryId: categoryId || undefined,
      isPublic,
      ingredients: ingredients.filter((i) => i.name).map(({ _id, ...ing }) => ing),
      steps: steps
        .filter((s) => s.text)
        .map((s, i) => ({ order: i + 1, text: s.text, externalImageUrl: s.externalImageUrl || undefined })),
      externalImageUrl: importedImageUrl || undefined,
    });
  }

  const addIngredient = () =>
    setIngredients([...ingredients, { _id: crypto.randomUUID(), name: '', amount: 1, unit: '' }]);
  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: string, value: string | number) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], [field]: value };
    setIngredients(updated);
  };

  const addStep = () => setSteps([...steps, { _id: crypto.randomUUID(), text: '', externalImageUrl: '' }]);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, value: string) => {
    const updated = [...steps];
    updated[i] = { ...updated[i], text: value };
    setSteps(updated);
  };

  function moveIngredient(from: number, to: number) {
    if (from === to) return;
    const next = [...ingredients];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setIngredients(next);
  }

  function moveStep(from: number, to: number) {
    if (from === to) return;
    const next = [...steps];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setSteps(next);
  }

  return (
    <div className="page-container">
      {showImport && <ImportUrlDialog onImport={applyImport} onClose={() => setShowImport(false)} />}

      <div className="recipe-actions form-back">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
          {t('recipe.form.back')}
        </button>
        {!isEdit && (
          <>
            <button type="button" onClick={() => setShowImport(true)} className="outline ms-auto">
              {t('recipe.import.button')}
            </button>
            {importedImageUrl && (
              <img src={importedImageUrl} alt={t('recipe.form.importedPhoto')} className="import-photo-preview" />
            )}
          </>
        )}
      </div>
      <h1 className="form-title">{isEdit ? t('recipe.form.editTitle') : t('recipe.form.newTitle')}</h1>

      <form onSubmit={handleSubmit} className="form-stack">
        <Field id="f-title" label={t('recipe.form.titleLabel')}>
          <input
            id="f-title"
            title={t('recipe.form.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>

        <Field id="f-desc" label={t('recipe.form.description')}>
          <textarea
            id="f-desc"
            title={t('recipe.form.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-v"
          />
        </Field>

        <div className="grid-3">
          <Field id="f-servings" label={t('recipe.form.servings')}>
            <input
              id="f-servings"
              title={t('recipe.form.servings')}
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
            />
          </Field>
          <Field id="f-prep" label={t('recipe.form.prepTime')}>
            <input
              id="f-prep"
              title={t('recipe.form.prepTime')}
              type="number"
              min={0}
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </Field>
          <Field id="f-cook" label={t('recipe.form.cookTime')}>
            <input
              id="f-cook"
              title={t('recipe.form.cookTime')}
              type="number"
              min={0}
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid-2">
          <Field id="f-cat" label={t('recipe.form.category')}>
            <select
              id="f-cat"
              title={t('recipe.form.category')}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{t('recipe.form.noCategory')}</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="f-rating" label={t('recipe.form.rating')}>
            <input
              id="f-rating"
              title={t('recipe.form.rating')}
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </Field>
        </div>

        <Field id="f-tags" label={t('recipe.form.tags')}>
          <input
            id="f-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t('recipe.form.tagsPlaceholder')}
          />
          {allTags && allTags.length > 0 && (
            <div className="tag-chips">
              {allTags.map((tg) => {
                const current = tags
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean);
                const active = current.includes(tg);
                const handleTagClick = () => {
                  const list = tags
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean);
                  const next = active ? list.filter((x) => x !== tg) : [...list, tg];
                  setTags(next.join(', '));
                };
                return active ? (
                  <button
                    key={tg}
                    type="button"
                    onClick={handleTagClick}
                    className="tag tag--btn tag--large tag--active"
                    aria-pressed="true"
                  >
                    {tg}
                  </button>
                ) : (
                  <button
                    key={tg}
                    type="button"
                    onClick={handleTagClick}
                    className="tag tag--btn tag--large"
                    aria-pressed="false"
                  >
                    {tg}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <fieldset>
          <legend className="field__label">{t('recipe.form.ingredients')}</legend>
          <ol className="drag-list">
            {ingredients.map((ing, i) => (
              <li
                key={ing._id}
                className={`ingredient-row${dragIngIdx === i ? ' is-dragging' : ''}`}
                draggable
                onDragStart={() => setDragIngIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIngIdx !== null) moveIngredient(dragIngIdx, i);
                  setDragIngIdx(null);
                }}
                onDragEnd={() => setDragIngIdx(null)}
              >
                <span className="drag-handle" aria-hidden="true">
                  ⠿
                </span>
                <input
                  aria-label={t('recipe.form.ingredientName')}
                  placeholder={t('recipe.form.ingredientName')}
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                  className="ingredient-name"
                />
                <input
                  type="number"
                  aria-label={t('recipe.form.ingredientQty')}
                  placeholder={t('recipe.form.ingredientQty')}
                  value={ing.amount}
                  onChange={(e) => updateIngredient(i, 'amount', Number(e.target.value))}
                />
                <input
                  aria-label={t('recipe.form.ingredientUnit')}
                  placeholder={t('recipe.form.ingredientUnit')}
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
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
            onClick={addIngredient}
            className="secondary outline btn-sm btn-list-add"
            aria-label={t('recipe.form.addIngredient')}
          >
            {t('recipe.form.add')}
          </button>
        </fieldset>

        <fieldset>
          <legend className="field__label">{t('recipe.form.steps')}</legend>
          <ol className="drag-list">
            {steps.map((step, i) => (
              <li
                key={step._id}
                className={`step-row${dragStepIdx === i ? ' is-dragging' : ''}`}
                draggable
                onDragStart={() => setDragStepIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragStepIdx !== null) moveStep(dragStepIdx, i);
                  setDragStepIdx(null);
                }}
                onDragEnd={() => setDragStepIdx(null)}
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
                    onChange={(e) => updateStep(i, e.target.value)}
                    rows={2}
                    placeholder={t('recipe.form.step', { n: i + 1 })}
                    className="resize-v flex-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeStep(i)}
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
            onClick={addStep}
            className="secondary outline btn-sm btn-list-add"
            aria-label={t('recipe.form.addStep')}
          >
            {t('recipe.form.add')}
          </button>
        </fieldset>

        <label className="checkbox-label">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          {t('recipe.form.isPublic')}
        </label>

        {saveMut.isError && <p className="form-error">{t('recipe.form.saveError')}</p>}

        <button type="submit" disabled={saveMut.isPending}>
          {saveMut.isPending ? t('recipe.form.saving') : isEdit ? t('recipe.form.save') : t('recipe.form.create')}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children, id }: { label: string; children: React.ReactNode; id?: string }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}
