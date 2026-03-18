import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recipesApi } from '../api/recipes';
import { categoriesApi } from '../api/categories';
import { useAuthStore } from '../store/authStore';
import LanguageSwitcher from '../components/LanguageSwitcher';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export default function RecipeListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState('');
  const { user, token } = useAuthStore();
  const isLoggedIn = !!token;

  const { data, isLoading } = useQuery({
    queryKey: isLoggedIn
      ? ['recipes', search, tag, category]
      : ['recipes', 'public', search, tag, category],
    queryFn: () =>
      isLoggedIn
        ? recipesApi.list({ q: search || undefined, tag: tag || undefined, category: category || undefined })
        : recipesApi.listPublic({ q: search || undefined, tag: tag || undefined, category: category || undefined }),
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>{t('app.title')}</h1>
          {data && <span style={{ fontSize: 13, color: '#888' }}>{data.total} {t('profile.recipesCount')}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageSwitcher />
          {isLoggedIn ? (
            <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#555' }}>
              <span style={{ fontSize: 13 }}>{user?.displayName ?? user?.email}</span>
              <span style={smallBtnStyle}>👤</span>
            </Link>
          ) : (
            <>
              <Link to="/login"><button style={outlineBtnStyle}>{t('auth.signIn')}</button></Link>
              <Link to="/register"><button style={btnStyle}>{t('auth.register')}</button></Link>
            </>
          )}
        </div>
      </header>

      <div className="filter-bar">
        <input
          placeholder={t('recipe.list.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="filter-search"
          style={inputStyle}
        />
        <input
          placeholder={t('recipe.list.tagPlaceholder')}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="filter-aux"
          style={{ ...inputStyle, width: 120 }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="filter-aux"
          style={{ ...inputStyle, width: 160 }}
        >
          <option value="">{t('recipe.list.allCategories')}</option>
          {categories?.map((c) => (
            <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
          ))}
        </select>
        {isLoggedIn && (
          <Link to="/recipes/new">
            <button style={btnStyle}>{t('recipe.list.addButton')}</button>
          </Link>
        )}
      </div>

      {isLoading && <p>{t('recipe.list.loading')}</p>}

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
                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                  🍽
                </div>
              )}
              <div style={{ padding: '12px 14px' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{r.title}</h3>
                {r.description && (
                  <p style={{ margin: 0, color: '#666', fontSize: 13, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {r.description}
                  </p>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {r.tags.slice(0, 3).map((tag) => (
                    <span key={tag} style={tagStyle}>{tag}</span>
                  ))}
                  {r.rating && <span style={tagStyle}>{'⭐'.repeat(r.rating)}</span>}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 };
const btnStyle: React.CSSProperties = { padding: '9px 18px', borderRadius: 8, background: '#2d6a4f', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 };
const outlineBtnStyle: React.CSSProperties = { padding: '9px 18px', borderRadius: 8, background: 'none', color: '#2d6a4f', border: '1px solid #2d6a4f', cursor: 'pointer', fontSize: 14 };
const smallBtnStyle: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, background: '#f0f0f0', border: 'none', cursor: 'pointer', fontSize: 13 };
const cardStyle: React.CSSProperties = { borderRadius: 10, border: '1px solid #eee', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer' };
const tagStyle: React.CSSProperties = { background: '#e8f5e9', color: '#2d6a4f', padding: '2px 8px', borderRadius: 12, fontSize: 12 };
