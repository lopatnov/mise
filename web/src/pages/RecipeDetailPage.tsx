import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import type { Recipe } from '../api/recipes';
import { recipesApi } from '../api/recipes';
import ConfirmDialog from '../components/ConfirmDialog';
import Lightbox from '../components/Lightbox';
import { useMetaTags } from '../hooks/useMetaTags';
import { usePageTitle } from '../hooks/usePageTitle';
import { useStructuredData } from '../hooks/useStructuredData';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';

const API_URL = import.meta.env.VITE_API_URL ?? '';

function buildRecipeSchema(recipe: Recipe, appUrl: string): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description ?? '',
    recipeYield: `${recipe.servings} servings`,
    recipeIngredient: recipe.ingredients.map((i) => `${i.amount} ${i.unit} ${i.name}`.trim()),
    recipeInstructions: [...recipe.steps]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ '@type': 'HowToStep', text: s.text, ...(s.photoUrl ? { image: `${appUrl}${s.photoUrl}` } : {}) })),
    datePublished: recipe.createdAt,
  };
  if (recipe.photoUrl) schema.image = `${appUrl}${recipe.photoUrl}`;
  if (recipe.prepTime) schema.prepTime = `PT${recipe.prepTime}M`;
  if (recipe.cookTime) schema.cookTime = `PT${recipe.cookTime}M`;
  if (recipe.tags.length > 0) schema.keywords = recipe.tags.join(', ');
  if (recipe.rating) {
    schema.aggregateRating = { '@type': 'AggregateRating', ratingValue: recipe.rating, ratingCount: 1 };
  }
  return schema;
}

export default function RecipeDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const stepFileRef = useRef<HTMLInputElement>(null);
  const pendingStepOrder = useRef<number | null>(null);
  const [targetServings, setTargetServings] = useState<number | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const toast = useToast();
  const { user } = useAuthStore();
  const isLoggedIn = !!user;

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.get(id ?? ''),
    enabled: !!id,
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  usePageTitle(recipe?.title);
  useStructuredData(recipe?.isPublic ? buildRecipeSchema(recipe, API_URL) : null);
  useMetaTags(
    recipe
      ? {
          'og:title': recipe.title,
          'og:description': recipe.description?.slice(0, 200) ?? '',
          'og:image': recipe.photoUrl ? `${API_URL}${recipe.photoUrl}` : '',
          'og:url': window.location.href,
          'og:type': 'article',
          'twitter:card': 'summary_large_image',
        }
      : null,
  );

  const deleteMut = useMutation({
    mutationFn: () => recipesApi.remove(id ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      navigate('/');
    },
    onError: () => toast.error(t('recipe.detail.deleteError')),
  });

  const duplicateMut = useMutation({
    mutationFn: () => {
      if (!recipe) throw new Error('No recipe');
      return recipesApi.create({
        title: t('recipe.detail.duplicateTitle', { title: recipe.title }),
        description: recipe.description,
        servings: recipe.servings,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        rating: recipe.rating,
        tags: [...recipe.tags],
        categoryId: recipe.categoryId,
        isPublic: false,
        ingredients: recipe.ingredients.map((ing) => ({ ...ing })),
        steps: [...recipe.steps].sort((a, b) => a.order - b.order).map((s, i) => ({ order: i + 1, text: s.text })),
      });
    },
    onSuccess: (saved) => {
      qc.setQueryData(['recipe', saved._id], saved);
      qc.invalidateQueries({ queryKey: ['recipes'] });
      navigate(`/recipes/${saved.slug ?? saved._id}/edit`);
    },
    onError: () => toast.error(t('recipe.detail.duplicateError')),
  });

  const favoriteMut = useMutation({
    mutationFn: () => (isFavorited ? recipesApi.removeFavorite(id ?? '') : recipesApi.addFavorite(id ?? '')),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', id] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: () => toast.error(t('recipe.detail.deleteError')),
  });

  const photoMut = useMutation({
    mutationFn: (file: File) => recipesApi.uploadPhoto(id ?? '', file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', id] });
      toast.success(t('recipe.detail.photoUploaded'));
    },
    onError: () => toast.error(t('recipe.detail.photoError')),
  });

  const stepPhotoMut = useMutation({
    mutationFn: ({ order, file }: { order: number; file: File }) => recipesApi.uploadStepPhoto(id ?? '', order, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', id] });
      toast.success(t('recipe.detail.photoUploaded'));
    },
    onError: () => toast.error(t('recipe.detail.photoError')),
  });

  if (isLoading)
    return (
      <div className="page-container recipe-detail__page" aria-busy="true" aria-label={t('recipe.detail.loading')}>
        <div className="skeleton skeleton-detail__actions" />
        <div className="skeleton skeleton-detail__title" />
        <div className="skeleton skeleton-detail__meta" />
        <div className="recipe-detail__grid">
          <div className="recipe-detail__main">
            <div className="skeleton skeleton-detail__photo" />
            <div className="skeleton skeleton-detail__line" />
            <div className="skeleton skeleton-detail__line skeleton-detail__line--med" />
            <div className="skeleton skeleton-detail__line skeleton-detail__line--short" />
            <div className="skeleton skeleton-detail__h2 skeleton-detail__h2--section" />
            <div className="skeleton skeleton-detail__step" />
            <div className="skeleton skeleton-detail__step" />
            <div className="skeleton skeleton-detail__step skeleton-detail__step--short" />
          </div>
          <aside className="recipe-detail__sidebar">
            <div className="skeleton skeleton-detail__h2" />
            <div className="skeleton skeleton-detail__ing" />
            <div className="skeleton skeleton-detail__ing" />
            <div className="skeleton skeleton-detail__ing skeleton-detail__ing--short" />
            <div className="skeleton skeleton-detail__ing" />
          </aside>
        </div>
      </div>
    );
  if (!recipe) return <p className="recipe-detail__loading">{t('recipe.detail.notFound')}</p>;

  const isOwner = !!user && recipe.authorId?.toString() === user.id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isOwner || isAdmin;
  const isFavorited = isLoggedIn && (recipe.savedBy ?? []).includes(user?.id ?? '');

  const recipeCategory = categories?.find((c) => c._id.toString() === recipe.categoryId?.toString());

  const effectiveServings = targetServings ?? recipe.servings;
  const scale = effectiveServings / recipe.servings;

  function fmtAmount(amount: number) {
    const v = amount * scale;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  return (
    <div className="page-container recipe-detail__page">
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {showConfirmDelete && (
        <ConfirmDialog
          message={t('recipe.detail.deleteConfirm')}
          confirmLabel={t('recipe.detail.deleteConfirmBtn')}
          cancelLabel={t('recipe.detail.deleteCancel')}
          onConfirm={() => deleteMut.mutate()}
          onCancel={() => setShowConfirmDelete(false)}
          isPending={deleteMut.isPending}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label={t('recipe.detail.changePhoto')}
        className="visually-hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) photoMut.mutate(f);
          e.target.value = '';
        }}
      />
      <input
        ref={stepFileRef}
        type="file"
        accept="image/*"
        aria-label={t('recipe.detail.changePhoto')}
        className="visually-hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && pendingStepOrder.current !== null) {
            stepPhotoMut.mutate({ order: pendingStepOrder.current, file: f });
          }
          e.target.value = '';
        }}
      />

      {/* Action bar: full width */}
      <div className="recipe-actions no-print">
        <Link to="/" className="btn-ghost">
          {t('recipe.detail.back')}
        </Link>
        {isLoggedIn && (
          <button
            type="button"
            onClick={() => favoriteMut.mutate()}
            disabled={favoriteMut.isPending}
            className="outline"
          >
            {isFavorited ? t('recipe.detail.unfavorite') : t('recipe.detail.favorite')}
          </button>
        )}
        <div className="recipe-actions__right">
          <button type="button" onClick={() => window.print()} className="outline">
            {t('recipe.detail.print')}
          </button>
          {isLoggedIn && !canEdit && (
            <button
              type="button"
              onClick={() => duplicateMut.mutate()}
              disabled={duplicateMut.isPending}
              className="outline"
            >
              {t('recipe.detail.duplicate')}
            </button>
          )}
          {canEdit && (
            <>
              <Link to={`/recipes/${id}/edit`} role="button" className="outline">
                {t('recipe.detail.edit')}
              </Link>
              <button
                type="button"
                onClick={() => duplicateMut.mutate()}
                disabled={duplicateMut.isPending}
                className="outline"
              >
                {t('recipe.detail.duplicate')}
              </button>
              <button type="button" onClick={() => setShowConfirmDelete(true)} className="btn-danger">
                {t('recipe.detail.delete')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2-column grid */}
      <div className="recipe-detail__grid">
        {/* LEFT: main content */}
        <div className="recipe-detail__main">
          <h1 className="recipe-detail__title">{recipe.title}</h1>

          {/* Meta row */}
          <div className="recipe-meta">
            {recipe.prepTime && <span>{t('recipe.detail.prepTime', { min: recipe.prepTime })}</span>}
            {recipe.cookTime && <span>{t('recipe.detail.cookTime', { min: recipe.cookTime })}</span>}
            {recipe.rating && <span>{'⭐'.repeat(recipe.rating)}</span>}
            {recipeCategory && (
              <span className="recipe-card__category">
                {recipeCategory.icon}{' '}
                {recipeCategory.slug
                  ? t(`categories.${recipeCategory.slug}`, recipeCategory.name)
                  : recipeCategory.name}
              </span>
            )}
            {recipe.isPublic && <span className="tag tag--public">🌐 {t('recipe.detail.public')}</span>}
          </div>

          {recipe.tags.length > 0 && (
            <div className="recipe-tags">
              {recipe.tags.map((tag) => (
                <span key={tag} className="tag tag--large">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Main photo */}
          <div className="photo-container">
            {recipe.photoUrl ? (
              <>
                <button
                  type="button"
                  className="photo-btn"
                  onClick={() => setLightboxSrc(`${API_URL}${recipe.photoUrl ?? ''}`)}
                  aria-label={recipe.title}
                >
                  <img
                    src={`${API_URL}${recipe.photoUrl}`}
                    alt={recipe.title}
                    className="recipe-photo__img"
                    loading="lazy"
                  />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    title={t('recipe.detail.changePhoto')}
                    className="photo-replace-btn"
                  >
                    📷
                  </button>
                )}
              </>
            ) : canEdit ? (
              <button type="button" onClick={() => fileRef.current?.click()} className="photo-placeholder">
                {t('recipe.detail.addPhoto')}
              </button>
            ) : null}
          </div>

          {recipe.description && <p className="recipe-detail__description">{recipe.description}</p>}

          {/* Steps */}
          {recipe.steps.length > 0 && (
            <section className="recipe-section">
              <h2 className="recipe-section__title">{t('recipe.detail.steps')}</h2>
              <ol className="recipe-section__list">
                {recipe.steps
                  .sort((a, b) => a.order - b.order)
                  .map((step) => (
                    <li key={step.order} className="recipe-step__item">
                      <div className="recipe-step__row">
                        <span className="recipe-step__text">{step.text}</span>
                        {canEdit && !step.photoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              pendingStepOrder.current = step.order;
                              stepFileRef.current?.click();
                            }}
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
                            onClick={() => setLightboxSrc(`${API_URL}${step.photoUrl ?? ''}`)}
                            aria-label={t('recipe.detail.addPhoto')}
                          >
                            <img
                              src={`${API_URL}${step.photoUrl}`}
                              alt=""
                              className="recipe-step__photo"
                              loading="lazy"
                            />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                pendingStepOrder.current = step.order;
                                stepFileRef.current?.click();
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
            </section>
          )}
        </div>

        {/* RIGHT: ingredients sidebar */}
        <aside className="recipe-detail__sidebar">
          {/* Servings scaler */}
          <div className="scaling-control no-print">
            <span>{t('recipe.detail.servings')}</span>
            <button
              type="button"
              onClick={() => setTargetServings(Math.max(1, effectiveServings - 1))}
              className="btn-icon"
            >
              −
            </button>
            <span className="scaling-control__count">{effectiveServings}</span>
            <button type="button" onClick={() => setTargetServings(effectiveServings + 1)} className="btn-icon">
              +
            </button>
            {scale !== 1 && (
              <button type="button" onClick={() => setTargetServings(null)} className="btn-ghost ms-auto">
                {t('recipe.detail.reset')}
              </button>
            )}
          </div>

          {recipe.ingredients.length > 0 && (
            <section className="recipe-section">
              <h2 className="recipe-section__title">{t('recipe.detail.ingredients')}</h2>
              <ul className="recipe-section__list">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.name} className="recipe-section__item">
                    <strong>
                      {fmtAmount(ing.amount)} {ing.unit}
                    </strong>{' '}
                    {ing.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
