import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
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
      <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
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
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>🍽 Mise</h1>
      <h2 style={{ textAlign: 'center', marginBottom: 28, fontWeight: 400, color: '#555', fontSize: 20 }}>
        {t('auth.forgotTitle')}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <button type="submit" disabled={loading} style={btnStyle}>
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

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 15,
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
