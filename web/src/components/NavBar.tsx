import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import LanguageSwitcher from './LanguageSwitcher';

const HIDDEN_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/setup'];

export default function NavBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, token } = useAuthStore();
  const { isDark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: close drawer on route change
  useEffect(() => setMenuOpen(false), [location.pathname]);

  if (HIDDEN_PATHS.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__logo">
        {t('app.title')}
      </Link>

      {/* Desktop actions */}
      <div className="navbar__actions navbar__actions--desktop">
        <button type="button" onClick={toggle} className="navbar__theme-btn" aria-label="Toggle dark mode">
          {isDark ? '☀️' : '🌙'}
        </button>
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

      {/* Mobile hamburger */}
      <button
        type="button"
        className="navbar__hamburger"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={menuOpen}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="navbar__drawer">
          <button type="button" onClick={toggle} className="navbar__theme-btn" aria-label="Toggle dark mode">
            {isDark ? '☀️' : '🌙'}
          </button>
          <LanguageSwitcher />
          {token ? (
            <>
              <Link to="/recipes/new" role="button" onClick={() => setMenuOpen(false)}>
                {t('recipe.list.addButton')}
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" role="button" className="outline" onClick={() => setMenuOpen(false)}>
                  {t('admin.link')}
                </Link>
              )}
              <Link to="/profile" className="profile-link" onClick={() => setMenuOpen(false)}>
                👤 {user?.displayName ?? user?.email}
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" role="button" className="outline" onClick={() => setMenuOpen(false)}>
                {t('auth.signIn')}
              </Link>
              <Link to="/register" role="button" onClick={() => setMenuOpen(false)}>
                {t('auth.register')}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
