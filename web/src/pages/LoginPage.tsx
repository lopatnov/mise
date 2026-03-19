import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

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
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <LanguageSwitcher />
      </div>
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
      <p style={{ textAlign: 'center', marginTop: 8 }}>
        <Link to="/forgot-password" style={{ fontSize: 13, color: '#888' }}>{t('auth.forgotPassword')}</Link>
      </p>
      <p style={{ textAlign: 'center', marginTop: 6 }}>
        <Link to="/" style={{ fontSize: 13, color: '#aaa' }}>← {t('recipe.list.communityTitle')}</Link>
      </p>
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
