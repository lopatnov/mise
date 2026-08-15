import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AdminInvitesTab from '../components/AdminInvitesTab';
import AdminSettingsTab from '../components/AdminSettingsTab';
import AdminUsersTab from '../components/AdminUsersTab';
import { usePageTitle } from '../hooks/usePageTitle';

const TABS = ['users', 'invites', 'settings'] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const { t } = useTranslation();
  usePageTitle(t('admin.title'));
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="page-container page-container--wide">
      <div className="page-header">
        <h1 className="admin-page-title">{t('admin.title')}</h1>
        <Link to="/" className="link--sm">
          {t('recipe.detail.back')}
        </Link>
      </div>

      <div className="tab-bar">
        {TABS.map((tabId) => (
          <button
            type="button"
            key={tabId}
            onClick={() => setTab(tabId)}
            className={`tab-btn${tab === tabId ? ' tab-btn--active' : ''}`}
          >
            {t(`admin.tab.${tabId}`)}
          </button>
        ))}
      </div>

      {tab === 'users' && <AdminUsersTab />}
      {tab === 'invites' && <AdminInvitesTab />}
      {tab === 'settings' && <AdminSettingsTab />}
    </div>
  );
}
