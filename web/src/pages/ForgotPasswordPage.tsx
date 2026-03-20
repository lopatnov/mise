import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  usePageTitle(t('auth.forgotTitle'));
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; devLink?: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setResult(res);
    } catch {
      setResult({ message: t('auth.forgotError') });
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="page-container--auth page-container--auth--center">
        <p className="auth-result-icon">📧</p>
        <p className="auth-result-text">{result.message}</p>
        {result.devLink && (
          <a href={result.devLink} className="dev-link">
            {result.devLink}
          </a>
        )}
        <Link to="/login" className="auth-links link--sm">
          ← {t('auth.signIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container--auth">
      <h1 className="auth-logo">🍽 Mise</h1>
      <h2 className="auth-subtitle">{t('auth.forgotTitle')}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="auth-input"
        />
        <button type="submit" disabled={loading} className="btn btn--primary btn--full btn--submit">
          {loading ? '...' : t('auth.forgotSend')}
        </button>
      </form>
      <p className="auth-links--sm">
        <Link to="/login" className="link--sm">
          ← {t('auth.signIn')}
        </Link>
      </p>
    </div>
  );
}
