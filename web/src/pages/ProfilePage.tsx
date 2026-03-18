import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recipesApi } from '../api/recipes';
import { useAuthStore } from '../store/authStore';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['recipes', 'profile-count'],
    queryFn: () => recipesApi.list({ limit: 1 }),
  });

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px' }}>
      <Link to="/" style={{ fontSize: 14, color: '#2d6a4f' }}>{t('profile.back')}</Link>

      <div style={{ marginTop: 32, padding: 28, borderRadius: 16, border: '1px solid #eee', background: '#fff' }}>
        <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 16 }}>👤</div>

        <h2 style={{ margin: '0 0 4px', textAlign: 'center' }}>
          {user?.displayName ?? t('profile.noName')}
        </h2>
        <p style={{ margin: '0 0 24px', textAlign: 'center', color: '#666', fontSize: 14 }}>
          {user?.email}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ textAlign: 'center', padding: '12px 32px', background: '#f5f9f7', borderRadius: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2d6a4f' }}>
              {data?.total ?? '—'}
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{t('profile.recipesCount')}</div>
          </div>
        </div>

        <button onClick={handleLogout} style={logoutBtn}>
          {t('profile.signOut')}
        </button>
      </div>
    </div>
  );
}

const logoutBtn: React.CSSProperties = {
  width: '100%', padding: '10px', borderRadius: 8,
  border: '1px solid #ddd', background: '#fff',
  cursor: 'pointer', fontSize: 14, color: '#555',
};
