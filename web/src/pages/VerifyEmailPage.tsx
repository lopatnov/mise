import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../store/authStore';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  usePageTitle(t('auth.verifyEmailTitle'));
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = params.get('token') ?? '';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError(t('auth.verifyEmailInvalidLink'));
      setLoading(false);
      return;
    }
    authApi
      .verifyEmail(token)
      .then((res) => {
        setAuth(res.access_token, res.user);
        navigate('/');
      })
      .catch(() => {
        setError(t('auth.verifyEmailError'));
        setLoading(false);
      });
  }, [token, t, setAuth, navigate]);

  if (loading) {
    return (
      <div className="page-container--auth page-container--auth--center">
        <article>
          <p className="auth-result-icon">📧</p>
          <p className="auth-result-text">{t('auth.verifyEmailTitle')}…</p>
        </article>
      </div>
    );
  }

  return (
    <div className="page-container--auth page-container--auth--center">
      <article>
        <p className="form-error">{error}</p>
        <p className="auth-links--sm">
          <Link to="/login" className="link--sm">
            ← {t('auth.signIn')}
          </Link>
        </p>
      </article>
    </div>
  );
}
