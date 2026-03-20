import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';
import { authApi } from '../api/auth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../store/authStore';

export default function SetupPage() {
  const { t } = useTranslation();
  usePageTitle('Setup');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminApi.setup(email, password, displayName || undefined);
      const res = await authApi.login(email, password);
      setAuth(res.access_token, res.user);
      navigate('/admin');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('admin.setup.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container--setup">
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>🍽 Mise</h1>
      <h2 style={{ textAlign: 'center', marginBottom: 32, fontWeight: 400, color: '#555' }}>
        {t('admin.setup.title')}
      </h2>
      <div className="setup-card">
        <p style={{ margin: '0 0 20px', color: '#666', fontSize: 14, lineHeight: 1.5 }}>
          {t('admin.setup.description')}
        </p>
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
          {error && <p style={{ color: 'red', margin: 0, fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn--primary btn--full btn--submit">
            {loading ? t('admin.setup.creating') : t('admin.setup.createBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}
