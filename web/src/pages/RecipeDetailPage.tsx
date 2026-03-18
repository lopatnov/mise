import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { recipesApi } from '../api/recipes';
import { useToast } from '../store/toastStore';

export default function RecipeDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [targetServings, setTargetServings] = useState<number | null>(null);
  const toast = useToast();

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.get(id!),
    enabled: !!id,
  });

  const deleteMut = useMutation({
    mutationFn: () => recipesApi.remove(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); navigate('/'); },
    onError: () => toast.error(t('recipe.detail.deleteError')),
  });

  const photoMut = useMutation({
    mutationFn: (file: File) => recipesApi.uploadPhoto(id!, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipe', id] }); toast.success(t('recipe.detail.photoUploaded')); },
    onError: () => toast.error(t('recipe.detail.photoError')),
  });

  if (isLoading) return <p style={{ padding: 32 }}>{t('recipe.detail.loading')}</p>;
  if (!recipe) return <p style={{ padding: 32 }}>{t('recipe.detail.notFound')}</p>;

  const effectiveServings = targetServings ?? recipe.servings;
  const scale = effectiveServings / recipe.servings;

  function fmtAmount(amount: number) {
    const v = amount * scale;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Link to="/">{t('recipe.detail.back')}</Link>
        <Link to={`/recipes/${id}/edit`} style={{ marginLeft: 'auto' }}>{t('recipe.detail.edit')}</Link>
        <button onClick={() => deleteMut.mutate()} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
          {t('recipe.detail.delete')}
        </button>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        style={{ position: 'relative', cursor: 'pointer', marginBottom: 20, borderRadius: 12, overflow: 'hidden' }}
      >
        {recipe.photoUrl ? (
          <>
            <img
              src={`${import.meta.env.VITE_API_URL ?? ''}${recipe.photoUrl}`}
              alt={recipe.title}
              style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.35)'; (e.currentTarget.firstChild as HTMLElement).style.opacity = '1'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)'; (e.currentTarget.firstChild as HTMLElement).style.opacity = '0'; }}
            >
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 500, opacity: 0, transition: 'opacity 0.15s' }}>
                {t('recipe.detail.changePhoto')}
              </span>
            </div>
          </>
        ) : (
          <div style={{ height: 160, border: '2px dashed #ccc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            {t('recipe.detail.addPhoto')}
          </div>
        )}
      </div>

      <input
        ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) photoMut.mutate(f); }}
      />

      <h1 style={{ margin: '0 0 8px' }}>{recipe.title}</h1>

      <div style={{ display: 'flex', gap: 12, color: '#666', fontSize: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        {recipe.prepTime && <span>{t('recipe.detail.prepTime', { min: recipe.prepTime })}</span>}
        {recipe.cookTime && <span>{t('recipe.detail.cookTime', { min: recipe.cookTime })}</span>}
        {recipe.rating && <span>{'⭐'.repeat(recipe.rating)}</span>}
      </div>

      {/* Scaling control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '10px 14px', background: '#f5f5f5', borderRadius: 10 }}>
        <span style={{ fontSize: 14, color: '#555' }}>{t('recipe.detail.servings')}</span>
        <button
          onClick={() => setTargetServings(Math.max(1, effectiveServings - 1))}
          style={scaleBtn}
        >−</button>
        <span style={{ fontWeight: 600, fontSize: 16, minWidth: 28, textAlign: 'center' }}>{effectiveServings}</span>
        <button
          onClick={() => setTargetServings(effectiveServings + 1)}
          style={scaleBtn}
        >+</button>
        {scale !== 1 && (
          <button
            onClick={() => setTargetServings(null)}
            style={{ marginLeft: 'auto', fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('recipe.detail.reset')}
          </button>
        )}
      </div>

      {recipe.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {recipe.tags.map((tag) => (
            <span key={tag} style={{ background: '#e8f5e9', color: '#2d6a4f', padding: '2px 10px', borderRadius: 12, fontSize: 13 }}>{tag}</span>
          ))}
        </div>
      )}

      {recipe.description && <p style={{ color: '#444', lineHeight: 1.6, marginBottom: 20 }}>{recipe.description}</p>}

      {recipe.ingredients.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>{t('recipe.detail.ingredients')}</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <strong>{fmtAmount(ing.amount)} {ing.unit}</strong> {ing.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section>
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>{t('recipe.detail.steps')}</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {recipe.steps
              .sort((a, b) => a.order - b.order)
              .map((step, i) => (
                <li key={i} style={{ marginBottom: 10, lineHeight: 1.6 }}>{step.text}</li>
              ))}
          </ol>
        </section>
      )}
    </div>
  );
}

const scaleBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', border: '1px solid #ccc',
  background: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
