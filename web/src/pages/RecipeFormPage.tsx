import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import type { Recipe } from '../api/recipes';
import { recipesApi } from '../api/recipes';
import ConfirmDialog from '../components/ConfirmDialog';
import ImportTextDialog from '../components/ImportTextDialog';
import ImportUrlDialog from '../components/ImportUrlDialog';
import type { IngredientRow } from '../components/IngredientsEditor';
import IngredientsEditor, { newIngredientRow } from '../components/IngredientsEditor';
import type { StepRow } from '../components/StepsEditor';
import StepsEditor, { newStepRow } from '../components/StepsEditor';
import TagChips from '../components/TagChips';
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
  const [ingredients, setIngredients] = useState<IngredientRow[]>([newIngredientRow()]);
  const [steps, setSteps] = useState<StepRow[]>([newStepRow()]);
  const [showImport, setShowImport] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);
  const [importedImageUrl, setImportedImageUrl] = useState('');
  const [photoPreviewFailed, setPhotoPreviewFailed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const markDirty = () => setIsDirty(true);

  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Deprecated per spec but still required by Chrome < 119 and legacy browsers
      // to show the confirmation dialog; the string value itself is ignored.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

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
        setSteps(
          existing.steps.map((s) => ({
            _id: crypto.randomUUID(),
            text: s.text,
            externalImageUrl: '',
            sourceOrder: s.order,
          })),
        );
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
    if (data.externalImageUrl) {
      setImportedImageUrl(data.externalImageUrl);
      setPhotoPreviewFailed(false);
    }
    markDirty();
    setShowImport(false);
    setShowTextImport(false);
  }

  const saveMut = useMutation({
    mutationFn: (data: Partial<Recipe>) => (isEdit ? recipesApi.update(id ?? '', data) : recipesApi.create(data)),
    onSuccess: (saved) => {
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe', saved._id] });
      navigate(`/recipes/${saved.slug ?? saved._id}`);
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
        .map((s, i) => ({
          order: i + 1,
          text: s.text,
          externalImageUrl: s.externalImageUrl || undefined,
          // Lets the server keep an already-uploaded photo with this step after a reorder/removal
          sourceOrder: s.sourceOrder,
        })),
      externalImageUrl: importedImageUrl || undefined,
    });
  }

  function changeIngredients(next: IngredientRow[]) {
    setIngredients(next);
    markDirty();
  }

  function changeSteps(next: StepRow[]) {
    setSteps(next);
    markDirty();
  }

  return (
    <div className="page-container">
      {showImport && <ImportUrlDialog onImport={applyImport} onClose={() => setShowImport(false)} />}
      {showTextImport && <ImportTextDialog onImport={applyImport} onClose={() => setShowTextImport(false)} />}
      {blocker.state === 'blocked' && (
        <ConfirmDialog
          message={t('recipe.form.unsavedMessage')}
          confirmLabel={t('recipe.form.unsavedLeave')}
          cancelLabel={t('recipe.form.unsavedStay')}
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}

      <div className="recipe-actions form-back">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
          {t('recipe.form.back')}
        </button>
        {!isEdit && (
          <>
            <button type="button" onClick={() => setShowImport(true)} className="outline ms-auto">
              {t('recipe.import.button')}
            </button>
            <button type="button" onClick={() => setShowTextImport(true)} className="outline">
              {t('recipe.import.textButton')}
            </button>
            {importedImageUrl &&
              (photoPreviewFailed ? (
                <p className="import-photo-note">{t('recipe.form.importedPhotoNote')}</p>
              ) : (
                <img
                  src={importedImageUrl}
                  alt={t('recipe.form.importedPhoto')}
                  className="import-photo-preview"
                  onError={() => setPhotoPreviewFailed(true)}
                />
              ))}
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
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            required
          />
        </Field>

        <Field id="f-desc" label={t('recipe.form.description')}>
          <textarea
            id="f-desc"
            title={t('recipe.form.description')}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
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
              onChange={(e) => {
                setServings(Number(e.target.value));
                markDirty();
              }}
            />
          </Field>
          <Field id="f-prep" label={t('recipe.form.prepTime')}>
            <input
              id="f-prep"
              title={t('recipe.form.prepTime')}
              type="number"
              min={0}
              value={prepTime}
              onChange={(e) => {
                setPrepTime(e.target.value);
                markDirty();
              }}
            />
          </Field>
          <Field id="f-cook" label={t('recipe.form.cookTime')}>
            <input
              id="f-cook"
              title={t('recipe.form.cookTime')}
              type="number"
              min={0}
              value={cookTime}
              onChange={(e) => {
                setCookTime(e.target.value);
                markDirty();
              }}
            />
          </Field>
        </div>

        <div className="grid-2">
          <Field id="f-cat" label={t('recipe.form.category')}>
            <select
              id="f-cat"
              title={t('recipe.form.category')}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                markDirty();
              }}
            >
              <option value="">{t('recipe.form.noCategory')}</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.icon} {c.slug ? t(`categories.${c.slug}`, c.name) : c.name}
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
              onChange={(e) => {
                setRating(e.target.value);
                markDirty();
              }}
            />
          </Field>
        </div>

        <Field id="f-tags" label={t('recipe.form.tags')}>
          <input
            id="f-tags"
            value={tags}
            onChange={(e) => {
              setTags(e.target.value);
              markDirty();
            }}
            placeholder={t('recipe.form.tagsPlaceholder')}
          />
          {allTags && allTags.length > 0 && (
            <TagChips
              allTags={allTags}
              value={tags}
              onChange={(next) => {
                setTags(next);
                markDirty();
              }}
            />
          )}
        </Field>

        <IngredientsEditor ingredients={ingredients} onChange={changeIngredients} />

        <StepsEditor steps={steps} onChange={changeSteps} />

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => {
              setIsPublic(e.target.checked);
              markDirty();
            }}
          />
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
