import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import { recipesApi } from '../api/recipes';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const PAGE_SIZE = 12;

function useDebounce<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function RecipeListPage() {
  const { t } = useTranslation();
  const siteTitle = usePageTitle();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState('');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const { user, token } = useAuthStore();
  const isLoggedIn = !!token;

  const debouncedSearch = useDebounce(search, 400);

  function changeSearch(v: string) {
    setSearch(v);
    setPage(1);
  }
  function changeTag(v: string) {
    setTag(v);
    setPage(1);
  }
  function changeCategory(v: string) {
    setCategory(v);
    setPage(1);
  }
  function changeMine() {
    setMine((v) => !v);
    setPage(1);
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: isLoggedIn
      ? ['recipes', debouncedSearch, tag, category, mine, page]
      : ['recipes', 'public', debouncedSearch, tag, category, page],
    queryFn: () =>
      isLoggedIn
        ? recipesApi.list({
            q: debouncedSearch || undefined,
            tag: tag || undefined,
            category: category || undefined,
            mine: mine || undefined,
            page,
            limit: PAGE_SIZE,
          })
        : recipesApi.listPublic({
            q: debouncedSearch || undefined,
            tag: tag || undefined,
            category: category || undefined,
            page,
            limit: PAGE_SIZE,
          }),
    placeholderData: keepPreviousData,
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: allTags } = useQuery({ queryKey: ['recipe-tags'], queryFn: recipesApi.getTags });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  function goToPage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="page-container page-container--wide">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">🍽 {siteTitle}</h1>
          {data && (
            <p className="page-header__subtitle">
              {data.total} {t('profile.recipesCount')}
              {isFetching && ' …'}
            </p>
          )}
        </div>
        <div className="page-header__actions">
          <LanguageSwitcher />
          {isLoggedIn ? (
            <>
              {user?.role === 'admin' && (
                <Link to="/admin" className="btn btn--nav">
                  ⚙️ {t('admin.link')}
                </Link>
              )}
              <Link to="/profile" className="profile-link">
                <span className="profile-link__name">{user?.displayName ?? user?.email}</span>
                <span className="btn btn--small">👤</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <button className="btn btn--outline">{t('auth.signIn')}</button>
              </Link>
              <Link to="/register">
                <button className="btn btn--primary">{t('auth.register')}</button>
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="filter-bar">
        <input
          placeholder={t('recipe.list.searchPlaceholder')}
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          className="filter-search form-input"
        />
        <select
          value={tag}
          onChange={(e) => changeTag(e.target.value)}
          className="filter-aux filter-aux--sm form-input"
        >
          <option value="">{t('recipe.list.allTags')}</option>
          {allTags?.map((tg) => (
            <option key={tg} value={tg}>
              {tg}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => changeCategory(e.target.value)}
          className="filter-aux filter-aux--md form-input"
        >
          <option value="">{t('recipe.list.allCategories')}</option>
          {categories?.map((c) => (
            <option key={c._id} value={c._id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        {isLoggedIn && (
          <button
            onClick={changeMine}
            className={mine ? 'btn btn--primary' : 'btn btn--outline'}
          >
            {t('recipe.list.mine')}
          </button>
        )}
        {isLoggedIn && (
          <Link to="/recipes/new">
            <button className="btn btn--primary">{t('recipe.list.addButton')}</button>
          </Link>
        )}
      </div>

      {isLoading && !data && <p>{t('recipe.list.loading')}</p>}

      {data && data.items.length === 0 && (
        <div className="recipe-list__empty">
          <p className="recipe-list__empty-icon">🍳</p>
          <p>{t('recipe.list.empty')}</p>
        </div>
      )}

      <div className="recipe-cards-grid">
        {data?.items.map((r) => {
          const cat = categories?.find((c) => c._id.toString() === r.categoryId?.toString());
          return (
            <Link key={r._id} to={`/recipes/${r._id}`} className="card-link">
              <div className="recipe-card">
                {r.photoUrl ? (
                  <img
                    src={`${API_URL}${r.photoUrl}`}
                    alt={r.title}
                    className="recipe-card__photo"
                  />
                ) : (
                  <div className="recipe-card__placeholder">🍽</div>
                )}
                <div className="recipe-card__body">
                  <h3 className="recipe-card__title">{r.title}</h3>
                  {r.description && <p className="recipe-card__desc">{r.description}</p>}
                  <div className="recipe-card__meta">
                    {cat && (
                      <span className="recipe-card__category">
                        {cat.icon} {cat.name}
                      </span>
                    )}
                    {r.tags.slice(0, 3).map((tg) => (
                      <span
                        key={tg}
                        className="tag tag--btn"
                        onClick={(e) => {
                          e.preventDefault();
                          changeTag(tg);
                        }}
                      >
                        {tg}
                      </span>
                    ))}
                    {r.rating && <span className="tag">{'⭐'.repeat(r.rating)}</span>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className={`page-btn${page === 1 ? ' page-btn--disabled' : ''}`}
          >
            {t('recipe.list.prev')}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`page-btn${p === page ? ' page-btn--active' : ''}`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className={`page-btn${page === totalPages ? ' page-btn--disabled' : ''}`}
          >
            {t('recipe.list.next')}
          </button>
        </div>
      )}
    </div>
  );
}
