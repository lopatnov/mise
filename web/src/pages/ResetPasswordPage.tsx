import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  usePageTitle(t('auth.resetTitle'));
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('auth.resetError'));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="page-container--auth page-container--auth--center">
        <article>
          <p className="form-error">{t('auth.resetInvalidLink')}</p>
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
      <article>
        <h1 className="auth-logo">🍽 Mise</h1>
        <h2 className="auth-subtitle">{t('auth.resetTitle')}</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-with-action">
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder={t('auth.newPassword')}
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
          <div className="input-with-action">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder={t('auth.confirmPassword')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="button"
              className="input-action-btn"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? '🙈' : '👁'}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '...' : t('auth.resetSave')}
          </button>
        </form>
      </article>
    </div>
  );
}
