import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import LanguageSwitcher from './LanguageSwitcher';

const HIDDEN_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/setup'];

export default function NavBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, token } = useAuthStore();

  if (HIDDEN_PATHS.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__logo">
        {t('app.title')}
      </Link>
      <div className="navbar__actions">
        <LanguageSwitcher />
        {token ? (
          <>
            <Link to="/recipes/new" role="button" className="navbar__btn">
              {t('recipe.list.addButton')}
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin" role="button" className="outline navbar__btn">
                {t('admin.link')}
              </Link>
            )}
            <Link to="/profile" className="profile-link">
              👤 {user?.displayName ?? user?.email}
            </Link>
          </>
        ) : (
          <>
            <Link to="/login" role="button" className="outline navbar__btn">
              {t('auth.signIn')}
            </Link>
            <Link to="/register" role="button" className="navbar__btn">
              {t('auth.register')}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
