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
      <div className="page-container--auth" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 32, marginBottom: 8 }}>📧</p>
        <p style={{ color: '#444', lineHeight: 1.6 }}>{result.message}</p>
        {result.devLink && (
          <p style={{ marginTop: 12 }}>
            <a href={result.devLink} style={{ color: '#2d6a4f', wordBreak: 'break-all', fontSize: 13 }}>
              {result.devLink}
            </a>
          </p>
        )}
        <Link to="/login" style={{ display: 'inline-block', marginTop: 20, color: '#2d6a4f', fontSize: 14 }}>
          ← {t('auth.signIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container--auth">
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>🍽 Mise</h1>
      <h2 style={{ textAlign: 'center', marginBottom: 28, fontWeight: 400, color: '#555', fontSize: 20 }}>
        {t('auth.forgotTitle')}
      </h2>
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
      <p style={{ textAlign: 'center', marginTop: 16 }}>
        <Link to="/login" style={{ fontSize: 13, color: '#888' }}>
          ← {t('auth.signIn')}
        </Link>
      </p>
    </div>
  );
}
