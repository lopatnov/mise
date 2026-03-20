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

      <div className="profile-card">
        <div className="profile-avatar">👤</div>

        <h2 className="profile-name">{user?.displayName ?? t('profile.noName')}</h2>
        <p className="profile-email">{user?.email}</p>

        <div className="stat-box">
          <div className="stat-box__inner">
            <div className="stat-box__value">{isLoading ? '…' : (data?.total ?? '—')}</div>
            <div className="stat-box__label">{t('profile.recipesCount')}</div>
          </div>
        </div>

        <button onClick={handleLogout} className="btn btn--outline btn--full">
          {t('profile.signOut')}
        </button>
      </div>
    </div>
  );
}
