import { useQuery } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';
import { authApi } from '../api/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const { t } = useTranslation();
  const siteTitle = usePageTitle(t('auth.signIn'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const { data: setupStatus } = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => adminApi.setupStatus(),
    staleTime: 60_000,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setAuth(res.access_token, res.user);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg === 'email-not-verified' ? t('auth.verifyEmailNotVerified') : t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container--auth">
      <div className="auth-header">
        <LanguageSwitcher />
      </div>
      <article>
        <h1 className="auth-title">🍽 {siteTitle}</h1>
        {setupStatus?.setupDone === false && (
          <div className="setup-warning">
            <span>⚠️ {t('admin.setup.notDone')}</span>
            <Link to="/setup" className="link--warn">
              {t('admin.setup.goSetup')}
            </Link>
          </div>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="input-with-action">
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="input-action-btn"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? '🙈' : '👁'}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
        <p className="auth-links">
          {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
        </p>
        <p className="auth-links--sm">
          <Link to="/forgot-password" className="link--sm">
            {t('auth.forgotPassword')}
          </Link>
        </p>
        <p className="auth-links--sm">
          <Link to="/" className="link--xlight">
            ← {t('recipe.list.communityTitle')}
          </Link>
        </p>
      </article>
    </div>
  );
}
