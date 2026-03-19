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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>🍽 {siteTitle}</h1>
          {data && (
            <span style={{ fontSize: 13, color: '#888' }}>
              {data.total} {t('profile.recipesCount')}
              {isFetching && ' …'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageSwitcher />
          {isLoggedIn ? (
            <>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  style={{
                    fontSize: 13,
                    color: '#2d6a4f',
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: '#e8f5e9',
                    textDecoration: 'none',
                  }}
                >
                  ⚙️ {t('admin.link')}
                </Link>
              )}
              <Link
                to="/profile"
                style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#555' }}
              >
                <span style={{ fontSize: 13 }}>{user?.displayName ?? user?.email}</span>
                <span style={smallBtnStyle}>👤</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <button style={outlineBtnStyle}>{t('auth.signIn')}</button>
              </Link>
              <Link to="/register">
                <button style={btnStyle}>{t('auth.register')}</button>
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
          className="filter-search"
          style={inputStyle}
        />
        <select
          value={tag}
          onChange={(e) => changeTag(e.target.value)}
          className="filter-aux"
          style={{ ...inputStyle, width: 140 }}
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
          className="filter-aux"
          style={{ ...inputStyle, width: 160 }}
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
            style={mine ? { ...btnStyle, fontSize: 14 } : { ...outlineBtnStyle, fontSize: 14 }}
          >
            {t('recipe.list.mine')}
          </button>
        )}
        {isLoggedIn && (
          <Link to="/recipes/new">
            <button style={btnStyle}>{t('recipe.list.addButton')}</button>
          </Link>
        )}
      </div>

      {isLoading && !data && <p>{t('recipe.list.loading')}</p>}

      {data && data.items.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          <p style={{ fontSize: 48 }}>🍳</p>
          <p>{t('recipe.list.empty')}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {data?.items.map((r) => (
          <Link key={r._id} to={`/recipes/${r._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={cardStyle}>
              {r.photoUrl ? (
                <img
                  src={`${API_URL}${r.photoUrl}`}
                  alt={r.title}
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                />
              ) : (
                <div
                  style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}
                >
                  🍽
                </div>
              )}
              <div style={{ padding: '12px 14px' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{r.title}</h3>
                {r.description && (
                  <p
                    style={{
                      margin: 0,
                      color: '#666',
                      fontSize: 13,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {r.description}
                  </p>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {r.tags.slice(0, 3).map((tg) => (
                    <span
                      key={tg}
                      style={{ ...tagStyle, cursor: 'pointer' }}
                      onClick={(e) => {
                        e.preventDefault();
                        changeTag(tg);
                      }}
                    >
                      {tg}
                    </span>
                  ))}
                  {r.rating && <span style={tagStyle}>{'⭐'.repeat(r.rating)}</span>}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
          <button onClick={() => goToPage(page - 1)} disabled={page === 1} style={pageBtn(page === 1)}>
            {t('recipe.list.prev')}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => goToPage(p)} style={pageBtn(false, p === page)}>
              {p}
            </button>
          ))}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            style={pageBtn(page === totalPages)}
          >
            {t('recipe.list.next')}
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 14,
};
const btnStyle: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: 8,
  background: '#2d6a4f',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
};
const outlineBtnStyle: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: 8,
  background: 'none',
  color: '#2d6a4f',
  border: '1px solid #2d6a4f',
  cursor: 'pointer',
  fontSize: 14,
};
const smallBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  background: '#f0f0f0',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
};
const cardStyle: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid #eee',
  overflow: 'hidden',
  background: '#fff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  cursor: 'pointer',
};
const tagStyle: React.CSSProperties = {
  background: '#e8f5e9',
  color: '#2d6a4f',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 12,
};

function pageBtn(disabled: boolean, active = false): React.CSSProperties {
  return {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    border: active ? '2px solid #2d6a4f' : '1px solid #ddd',
    background: active ? '#2d6a4f' : disabled ? '#f5f5f5' : '#fff',
    color: active ? '#fff' : disabled ? '#bbb' : '#333',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    padding: '0 10px',
  };
}
