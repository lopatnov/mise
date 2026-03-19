import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteToken, setInviteToken] = useState(params.get('invite') ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(email, password, displayName || undefined, inviteToken || undefined);
      setAuth(res.access_token, res.user);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('auth.emailTaken'));
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
          placeholder={t('auth.name')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={inputStyle}
        />
        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder={t('auth.passwordMin')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />
        <input
          placeholder={t('auth.inviteToken')}
          value={inviteToken}
          onChange={(e) => setInviteToken(e.target.value)}
          style={{ ...inputStyle, color: inviteToken ? '#2d6a4f' : undefined }}
        />
        {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? t('auth.registering') : t('auth.createAccount')}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 16 }}>
        {t('auth.hasAccount')} <Link to="/login">{t('auth.signIn')}</Link>
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 15,
  outline: 'none',
};
const btnStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: 8,
  background: '#2d6a4f',
  color: '#fff',
  border: 'none',
  fontSize: 15,
  cursor: 'pointer',
};
