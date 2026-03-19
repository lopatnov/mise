import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError(t('auth.passwordMismatch')); return; }
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
      <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <p style={{ color: 'red' }}>{t('auth.resetInvalidLink')}</p>
        <Link to="/login">← {t('auth.signIn')}</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>🍽 Mise</h1>
      <h2 style={{ textAlign: 'center', marginBottom: 28, fontWeight: 400, color: '#555', fontSize: 20 }}>
        {t('auth.resetTitle')}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="password" placeholder={t('auth.newPassword')} value={password}
          onChange={(e) => setPassword(e.target.value)} required minLength={6}
          style={inputStyle}
        />
        <input
          type="password" placeholder={t('auth.confirmPassword')} value={confirm}
          onChange={(e) => setConfirm(e.target.value)} required minLength={6}
          style={inputStyle}
        />
        {error && <p style={{ color: 'red', margin: 0, fontSize: 14 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? '...' : t('auth.resetSave')}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15,
};
const btnStyle: React.CSSProperties = {
  padding: '10px', borderRadius: 8, background: '#2d6a4f',
  color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer',
};
