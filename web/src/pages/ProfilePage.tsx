import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { recipesApi } from '../api/recipes';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../store/authStore';

export default function ProfilePage() {
  const { t } = useTranslation();
  usePageTitle(t('profile.title'));
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['recipes', '', '', ''],
    queryFn: () => recipesApi.list(),
  });

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="page-container page-container--narrow">
      <Link to="/" className="link--sm">
        {t('profile.back')}
      </Link>

      <article style={{ marginTop: '24px', textAlign: 'center' }}>
        <div className="profile-avatar">👤</div>
        <h2 className="profile-name">{user?.displayName ?? t('profile.noName')}</h2>
        <p className="profile-email">{user?.email}</p>

        <div className="profile-stat">
          <strong className="profile-stat__value">{isLoading ? '…' : (data?.total ?? '—')}</strong>
          <span className="profile-stat__label">{t('profile.recipesCount')}</span>
        </div>

        <button onClick={handleLogout} className="outline" style={{ width: '100%' }}>
          {t('profile.signOut')}
        </button>
      </article>
    </div>
  );
}
