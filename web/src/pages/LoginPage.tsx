import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { recipesApi } from '../api/recipes';
import LanguageSwitcher from '../components/LanguageSwitcher';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const { data: publicRecipes } = useQuery({
    queryKey: ['recipes', 'public'],
    queryFn: () => recipesApi.listPublic({ limit: 12 }),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setAuth(res.access_token, res.user);
      navigate('/');
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <LanguageSwitcher />
      </div>

      <div style={{ maxWidth: 380, margin: '0 auto 48px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 32 }}>{t('app.title')}</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" placeholder={t('auth.email')} value={email}
            onChange={(e) => setEmail(e.target.value)} required
            style={inputStyle}
          />
          <input
            type="password" placeholder={t('auth.password')} value={password}
            onChange={(e) => setPassword(e.target.value)} required
            style={inputStyle}
          />
          {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
        </p>
      </div>

      {publicRecipes && publicRecipes.items.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 16, color: '#444', textAlign: 'center' }}>
            {t('recipe.list.communityTitle')}
          </h2>
          <div className="grid-3">
            {publicRecipes.items.map((r) => (
              <div key={r._id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                {r.photoUrl ? (
                  <img
                    src={`${API_URL}${r.photoUrl}`}
                    alt={r.title}
                    style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ height: 140, background: '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🍽</div>
                )}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  {r.rating && <div style={{ fontSize: 12, color: '#888' }}>{'⭐'.repeat(r.rating)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8,
  border: '1px solid #ddd', fontSize: 15, outline: 'none',
};
const btnStyle: React.CSSProperties = {
  padding: '10px', borderRadius: 8, background: '#2d6a4f',
  color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer',
};
