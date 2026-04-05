import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { VerificationResponse } from '../api/auth';
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
  const [showPwd, setShowPwd] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [inviteToken, setInviteToken] = useState(params.get('invite') ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<VerificationResponse | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(email, password, displayName || undefined, inviteToken || undefined);
      if ('needsVerification' in res) {
        setVerification(res);
      } else {
        setAuth(res.access_token, res.user);
        navigate('/');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('auth.emailTaken'));
    } finally {
      setLoading(false);
    }
  }

  if (verification) {
    return (
      <div className="page-container--auth page-container--auth--center">
        <article>
          <p className="auth-result-icon">📧</p>
          <p className="auth-result-text">{t('auth.verifyEmailSent', { email: verification.email })}</p>
          {verification.devLink && (
            <a href={verification.devLink} className="dev-link">
              {verification.devLink}
            </a>
          )}
          <p className="auth-links--sm">
            <Link to="/login" className="link--sm">
              ← {t('auth.signIn')}
            </Link>
          </p>
        </article>
      </div>
    );
  }

  return (
    <div className="page-container--auth">
      <div className="auth-header">
        <LanguageSwitcher />
      </div>
      <article>
        <h1 className="auth-title">🍽 {siteTitle}</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <input placeholder={t('auth.name')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
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
              placeholder={t('auth.passwordMin')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
          <input
            placeholder={t('auth.inviteToken')}
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            className={inviteToken ? 'invite-input--filled' : undefined}
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? t('auth.registering') : t('auth.createAccount')}
          </button>
        </form>
        <p className="auth-links">
          {t('auth.hasAccount')} <Link to="/login">{t('auth.signIn')}</Link>
        </p>
      </article>
    </div>
  );
}
