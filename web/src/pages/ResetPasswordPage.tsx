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
  const [confirm, setConfirm] = useState('');
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
      <div className="page-container--auth" style={{ textAlign: 'center' }}>
        <p style={{ color: 'red' }}>{t('auth.resetInvalidLink')}</p>
        <Link to="/login">← {t('auth.signIn')}</Link>
      </div>
    );
  }

  return (
    <div className="page-container--auth">
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>🍽 Mise</h1>
      <h2 style={{ textAlign: 'center', marginBottom: 28, fontWeight: 400, color: '#555', fontSize: 20 }}>
        {t('auth.resetTitle')}
      </h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="password"
          placeholder={t('auth.newPassword')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="auth-input"
        />
        <input
          type="password"
          placeholder={t('auth.confirmPassword')}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          className="auth-input"
        />
        {error && <p style={{ color: 'red', margin: 0, fontSize: 14 }}>{error}</p>}
        <button type="submit" disabled={loading} className="btn btn--primary btn--full btn--submit">
          {loading ? '...' : t('auth.resetSave')}
        </button>
      </form>
    </div>
  );
}
