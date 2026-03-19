import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/admin';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function SetupPage() {
  const { t } = useTranslation();
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
      // Log in as the new admin
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
    <div style={{ maxWidth: 440, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>🍽 Mise</h1>
      <h2 style={{ textAlign: 'center', marginBottom: 32, fontWeight: 400, color: '#555' }}>
        {t('admin.setup.title')}
      </h2>
      <div style={{ background: '#fff', borderRadius: 12, padding: '28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <p style={{ margin: '0 0 20px', color: '#666', fontSize: 14, lineHeight: 1.5 }}>
          {t('admin.setup.description')}
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            placeholder={t('auth.name')} value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="email" placeholder={t('auth.email')} value={email}
            onChange={(e) => setEmail(e.target.value)} required
            style={inputStyle}
          />
          <input
            type="password" placeholder={t('auth.passwordMin')} value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={6}
            style={inputStyle}
          />
          {error && <p style={{ color: 'red', margin: 0, fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? t('admin.setup.creating') : t('admin.setup.createBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15,
};
const btnStyle: React.CSSProperties = {
  padding: '11px', borderRadius: 8, background: '#2d6a4f',
  color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer', marginTop: 4,
};
