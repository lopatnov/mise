import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const { t } = useTranslation();
  const siteTitle = usePageTitle(t('auth.register'));
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
    <div className="page-container--auth">
      <div className="auth-header">
        <LanguageSwitcher />
      </div>
      <h1 className="auth-title">🍽 {siteTitle}</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          placeholder={t('auth.name')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="auth-input"
        />
        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="auth-input"
        />
        <input
          type="password"
          placeholder={t('auth.passwordMin')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="auth-input"
        />
        <input
          placeholder={t('auth.inviteToken')}
          value={inviteToken}
          onChange={(e) => setInviteToken(e.target.value)}
          className={`auth-input${inviteToken ? ' invite-input--filled' : ''}`}
        />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn--primary btn--full btn--submit">
          {loading ? t('auth.registering') : t('auth.createAccount')}
        </button>
      </form>
      <p className="auth-links">
        {t('auth.hasAccount')} <Link to="/login">{t('auth.signIn')}</Link>
      </p>
    </div>
  );
}
