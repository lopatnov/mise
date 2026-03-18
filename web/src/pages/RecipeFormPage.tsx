import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from '../api/recipes';
import type { Recipe } from '../api/recipes';
import { categoriesApi } from '../api/categories';

export default function RecipeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
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
  const [ingredients, setIngredients] = useState([{ name: '', amount: 1, unit: '' }]);
  const [steps, setSteps] = useState(['']);

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const { data: existing } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.get(id!),
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
      if (existing.ingredients.length) setIngredients(existing.ingredients);
      if (existing.steps.length) setSteps(existing.steps.map((s) => s.text));
    }
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: (data: Partial<Recipe>) =>
      isEdit ? recipesApi.update(id!, data) : recipesApi.create(data),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
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
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      categoryId: categoryId || undefined,
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
        <button onClick={() => navigate(-1)} style={linkBtn}>← Назад</button>
      </div>
      <h1 style={{ marginBottom: 24 }}>{isEdit ? 'Редактировать рецепт' : 'Новый рецепт'}</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Название *">
          <input value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
        </Field>

        <Field label="Описание">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Field label="Порций">
            <input type="number" min={1} value={servings} onChange={(e) => setServings(Number(e.target.value))} style={inputStyle} />
          </Field>
          <Field label="Подготовка (мин)">
            <input type="number" min={0} value={prepTime} onChange={(e) => setPrepTime(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Готовка (мин)">
            <input type="number" min={0} value={cookTime} onChange={(e) => setCookTime(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Категория">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
              <option value="">— без категории —</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Рейтинг (1–5)">
            <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Теги (через запятую)">
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="суп, быстро, вегетарианское" style={inputStyle} />
        </Field>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Ингредиенты</label>
            <button type="button" onClick={addIngredient} style={smallBtn}>+ Добавить</button>
          </div>
          {ingredients.map((ing, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 32px', gap: 6, marginBottom: 6 }}>
              <input placeholder="Название" value={ing.name} onChange={(e) => updateIngredient(i, 'name', e.target.value)} style={inputStyle} />
              <input type="number" placeholder="Кол-во" value={ing.amount} onChange={(e) => updateIngredient(i, 'amount', Number(e.target.value))} style={inputStyle} />
              <input placeholder="Ед." value={ing.unit} onChange={(e) => updateIngredient(i, 'unit', e.target.value)} style={inputStyle} />
              <button type="button" onClick={() => removeIngredient(i)} style={{ ...smallBtn, background: '#fee', color: '#c00' }}>×</button>
            </div>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Шаги приготовления</label>
            <button type="button" onClick={addStep} style={smallBtn}>+ Добавить</button>
          </div>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 32px', gap: 6, marginBottom: 6, alignItems: 'start' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ minWidth: 24, paddingTop: 10, color: '#888', fontSize: 13 }}>{i + 1}.</span>
                <textarea
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  rows={2}
                  placeholder={`Шаг ${i + 1}`}
                  style={{ ...inputStyle, flex: 1, resize: 'vertical' }}
                />
              </div>
              <button type="button" onClick={() => removeStep(i)} style={{ ...smallBtn, background: '#fee', color: '#c00', marginTop: 6 }}>×</button>
            </div>
          ))}
        </div>

        {saveMut.isError && <p style={{ color: 'red' }}>Ошибка сохранения</p>}

        <button type="submit" disabled={saveMut.isPending} style={submitBtn}>
          {saveMut.isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать рецепт'}
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

const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#444' };
const smallBtn: React.CSSProperties = { padding: '4px 10px', borderRadius: 6, background: '#f0f0f0', border: 'none', cursor: 'pointer', fontSize: 13 };
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#2d6a4f', fontSize: 14, padding: 0 };
const submitBtn: React.CSSProperties = { padding: '12px', borderRadius: 8, background: '#2d6a4f', color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer', marginTop: 8 };
