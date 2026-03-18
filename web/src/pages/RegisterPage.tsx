import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(email, password, displayName || undefined);
      setAuth(res.access_token, res.user);
      navigate('/');
    } catch {
      setError('Email уже зарегистрирован или ошибка сервера');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 32 }}>🍽 Mise</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="Имя (необязательно)" value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={inputStyle}
        />
        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          style={inputStyle}
        />
        <input
          type="password" placeholder="Пароль (мин. 6 символов)" value={password}
          onChange={(e) => setPassword(e.target.value)} required minLength={6}
          style={inputStyle}
        />
        {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Регистрация...' : 'Создать аккаунт'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 16 }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8,
  border: '1px solid #ddd', fontSize: 15, outline: 'none',
};
const btnStyle: React.CSSProperties = {
  padding: '10px', borderRadius: 8, background: '#2d6a4f',
  color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer',
};
