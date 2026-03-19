import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import type { Recipe } from '../api/recipes';
import { recipesApi } from '../api/recipes';
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
  const [ingredients, setIngredients] = useState([{ name: '', amount: 1, unit: '' }]);
  const [steps, setSteps] = useState(['']);

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
      if (existing.ingredients.length) setIngredients(existing.ingredients);
      if (existing.steps.length) setSteps(existing.steps.map((s) => s.text));
    }
  }, [existing]);

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
      ingredients: ingredients.filter((i) => i.name),
      steps: steps.filter(Boolean).map((text, i) => ({ order: i + 1, text })),
    });
  }

  const addIngredient = () => setIngredients([...ingredients, { name: '', amount: 1, unit: '' }]);
  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: string, value: string | number) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], [field]: value };
    setIngredients(updated);
  };

  const addStep = () => setSteps([...steps, '']);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, value: string) => {
    const updated = [...steps];
    updated[i] = value;
    setSteps(updated);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={linkBtn}>
          {t('recipe.form.back')}
        </button>
      </div>
      <h1 style={{ marginBottom: 24 }}>{isEdit ? t('recipe.form.editTitle') : t('recipe.form.newTitle')}</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label={t('recipe.form.titleLabel')}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
        </Field>

        <Field label={t('recipe.form.description')}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        <div className="grid-3">
          <Field label={t('recipe.form.servings')}>
            <input
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Field label={t('recipe.form.prepTime')}>
            <input
              type="number"
              min={0}
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label={t('recipe.form.cookTime')}>
            <input
              type="number"
              min={0}
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="grid-2">
          <Field label={t('recipe.form.category')}>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
              <option value="">{t('recipe.form.noCategory')}</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('recipe.form.rating')}>
            <input
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label={t('recipe.form.tags')}>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t('recipe.form.tagsPlaceholder')}
            style={inputStyle}
          />
          {allTags && allTags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {allTags.map((t) => {
                const current = tags
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean);
                const active = current.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const list = tags
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean);
                      const next = active ? list.filter((x) => x !== t) : [...list, t];
                      setTags(next.join(', '));
                    }}
                    style={{
                      padding: '2px 10px',
                      borderRadius: 12,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      background: active ? '#2d6a4f' : '#e8f5e9',
                      color: active ? '#fff' : '#2d6a4f',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>{t('recipe.form.ingredients')}</label>
            <button type="button" onClick={addIngredient} style={smallBtn}>
              {t('recipe.form.add')}
            </button>
          </div>
          {ingredients.map((ing, i) => (
            <div key={i} className="ingredient-row">
              <input
                placeholder={t('recipe.form.ingredientName')}
                value={ing.name}
                onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                className="ingredient-name"
                style={inputStyle}
              />
              <input
                type="number"
                placeholder={t('recipe.form.ingredientQty')}
                value={ing.amount}
                onChange={(e) => updateIngredient(i, 'amount', Number(e.target.value))}
                style={inputStyle}
              />
              <input
                placeholder={t('recipe.form.ingredientUnit')}
                value={ing.unit}
                onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                style={{ ...smallBtn, background: '#fee', color: '#c00' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>{t('recipe.form.steps')}</label>
            <button type="button" onClick={addStep} style={smallBtn}>
              {t('recipe.form.add')}
            </button>
          </div>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{ display: 'grid', gridTemplateColumns: '1fr 32px', gap: 6, marginBottom: 6, alignItems: 'start' }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ minWidth: 24, paddingTop: 10, color: '#888', fontSize: 13 }}>{i + 1}.</span>
                <textarea
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  rows={2}
                  placeholder={t('recipe.form.step', { n: i + 1 })}
                  style={{ ...inputStyle, flex: 1, resize: 'vertical' }}
                />
              </div>
              <button
                type="button"
                onClick={() => removeStep(i)}
                style={{ ...smallBtn, background: '#fee', color: '#c00', marginTop: 6 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#444' }}
        >
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          {t('recipe.form.isPublic')}
        </label>

        {saveMut.isError && <p style={{ color: 'red' }}>{t('recipe.form.saveError')}</p>}

        <button type="submit" disabled={saveMut.isPending} style={submitBtn}>
          {saveMut.isPending ? t('recipe.form.saving') : isEdit ? t('recipe.form.save') : t('recipe.form.create')}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#444' };
const smallBtn: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  background: '#f0f0f0',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
};
const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#2d6a4f',
  fontSize: 14,
  padding: 0,
};
const submitBtn: React.CSSProperties = {
  padding: '12px',
  borderRadius: 8,
  background: '#2d6a4f',
  color: '#fff',
  border: 'none',
  fontSize: 15,
  cursor: 'pointer',
  marginTop: 8,
};
