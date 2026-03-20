import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { AppSettings } from '../api/admin';
import { adminApi } from '../api/admin';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../store/toastStore';

type Tab = 'users' | 'invites' | 'settings';

export default function AdminPage() {
  const { t } = useTranslation();
  usePageTitle(t('admin.title'));
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="page-container page-container--wide">
      <div className="page-header">
        <h1 style={{ margin: 0, fontSize: 22 }}>{t('admin.title')}</h1>
        <Link to="/" style={{ fontSize: 14, color: '#2d6a4f' }}>
          {t('recipe.detail.back')}
        </Link>
      </div>

      <div className="tab-bar">
        {(['users', 'invites', 'settings'] as Tab[]).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`tab-btn${tab === t2 ? ' tab-btn--active' : ''}`}
          >
            {t(`admin.tab.${t2}`)}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'invites' && <InvitesTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────────────

function UsersTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.listUsers,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isActive?: boolean; role?: string } }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(t('admin.users.updated'));
    },
    onError: () => toast.error(t('admin.users.updateError')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(t('admin.users.deleted'));
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? t('admin.users.deleteError'));
    },
  });

  if (isLoading) return <p>{t('recipe.list.loading')}</p>;

  return (
    <div>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        {users?.length ?? 0} {t('admin.users.total')}
      </p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t('auth.email')}</th>
            <th>{t('auth.name')}</th>
            <th>{t('admin.users.role')}</th>
            <th>{t('admin.users.status')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u._id}>
              <td>{u.email}</td>
              <td>{u.displayName ?? '—'}</td>
              <td>
                <select
                  value={u.role}
                  onChange={(e) => updateMut.mutate({ id: u._id, data: { role: e.target.value } })}
                  className="inline-select"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td>
                <button
                  onClick={() => updateMut.mutate({ id: u._id, data: { isActive: !u.isActive } })}
                  className={`badge badge--${u.isActive ? 'active' : 'blocked'}`}
                >
                  {u.isActive ? t('admin.users.active') : t('admin.users.blocked')}
                </button>
              </td>
              <td>
                <button
                  onClick={() => {
                    if (confirm(t('admin.users.confirmDelete'))) deleteMut.mutate(u._id);
                  }}
                  className="btn btn--danger"
                  title={t('recipe.detail.delete')}
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Invites Tab ────────────────────────────────────────────────────────────

function InvitesTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [days, setDays] = useState('7');
  const [newInvite, setNewInvite] = useState<{ token: string } | null>(null);

  const { data: invites, isLoading } = useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: adminApi.listInvites,
  });

  const createMut = useMutation({
    mutationFn: () => adminApi.createInvite({ email: email || undefined, expiresInDays: Number(days) }),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] });
      setNewInvite(inv);
      setEmail('');
    },
    onError: () => toast.error(t('admin.invites.createError')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteInvite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] });
      toast.success(t('admin.invites.revoked'));
    },
    onError: () => toast.error(t('admin.invites.revokeError')),
  });

  const appUrl = window.location.origin;

  return (
    <div>
      <div className="invite-panel">
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>{t('admin.invites.create')}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="admin-label">
              {t('auth.email')} ({t('admin.invites.emailOptional')})
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="admin-input"
              style={{ width: 240 }}
            />
          </div>
          <div>
            <label className="admin-label">{t('admin.invites.expiresInDays')}</label>
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="admin-input"
              style={{ width: 80 }}
            />
          </div>
          <button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="btn btn--primary">
            {t('admin.invites.generateBtn')}
          </button>
        </div>

        {newInvite && (
          <div className="invite-link-box">
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#2d6a4f' }}>
              {t('admin.invites.linkReady')}
            </p>
            <code style={{ fontSize: 12, wordBreak: 'break-all', color: '#333' }}>
              {appUrl}/register?invite={newInvite.token}
            </code>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(`${appUrl}/register?invite=${newInvite.token}`);
                toast.success(t('admin.invites.copied'));
              }}
              className="btn btn--outline btn--small"
              style={{ marginLeft: 12 }}
            >
              {t('admin.invites.copy')}
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <p>{t('recipe.list.loading')}</p>
      ) : (
        <div>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
            {invites?.length ?? 0} {t('admin.invites.active')}
          </p>
          {invites?.map((inv) => (
            <div key={inv._id} className="invite-row">
              <div>
                <code style={{ fontSize: 12, color: '#555' }}>
                  {appUrl}/register?invite={inv.token}
                </code>
                {inv.email && <span style={{ marginLeft: 10, color: '#888' }}>({inv.email})</span>}
                <span style={{ marginLeft: 10, color: '#aaa' }}>
                  {t('admin.invites.expires')}: {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => deleteMut.mutate(inv._id)}
                className="btn btn--danger"
              >
                🗑
              </button>
            </div>
          ))}
          {invites?.length === 0 && <p style={{ color: '#aaa', fontSize: 14 }}>{t('admin.invites.empty')}</p>}
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ───────────────────────────────────────────────────────────

function SettingsTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<Partial<AppSettings>>({});
  const [loaded, setLoaded] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.getSettings,
  });

  useEffect(() => {
    if (settingsData && !loaded) {
      setForm(settingsData);
      setLoaded(true);
    }
  }, [settingsData, loaded]);

  const saveMut = useMutation({
    mutationFn: () => adminApi.updateSettings(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      toast.success(t('admin.settings.saved'));
    },
    onError: () => toast.error(t('admin.settings.saveError')),
  });

  const set = (key: keyof AppSettings, val: string | boolean | number) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="admin-section">
        <h3>{t('admin.settings.general')}</h3>
        <div>
          <label className="admin-label">{t('admin.settings.siteTitle')}</label>
          <input
            value={form.siteTitle ?? ''}
            onChange={(e) => set('siteTitle', e.target.value)}
            placeholder="Mise"
            className="admin-input"
          />
        </div>
      </div>

      <div className="admin-section">
        <h3>{t('admin.settings.registration')}</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
          <input
            type="checkbox"
            checked={form.allowRegistration ?? true}
            onChange={(e) => set('allowRegistration', e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          {t('admin.settings.allowRegistration')}
        </label>
      </div>

      <div className="admin-section">
        <h3>{t('admin.settings.smtp')}</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{t('admin.settings.smtpHint')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="grid-2">
            <div>
              <label className="admin-label">{t('admin.settings.smtpHost')}</label>
              <input
                value={form.smtpHost ?? ''}
                onChange={(e) => set('smtpHost', e.target.value)}
                placeholder="smtp.gmail.com"
                className="admin-input"
              />
            </div>
            <div>
              <label className="admin-label">{t('admin.settings.smtpPort')}</label>
              <input
                type="number"
                value={form.smtpPort ?? ''}
                onChange={(e) => set('smtpPort', Number(e.target.value))}
                placeholder="587"
                className="admin-input"
              />
            </div>
          </div>
          <div>
            <label className="admin-label">{t('admin.settings.smtpUser')}</label>
            <input
              value={form.smtpUser ?? ''}
              onChange={(e) => set('smtpUser', e.target.value)}
              placeholder="noreply@example.com"
              className="admin-input"
            />
          </div>
          <div>
            <label className="admin-label">{t('admin.settings.smtpPass')}</label>
            <input
              type="password"
              value={form.smtpPass ?? ''}
              onChange={(e) => set('smtpPass', e.target.value)}
              placeholder="••••••••"
              className="admin-input"
            />
          </div>
          <div>
            <label className="admin-label">{t('admin.settings.smtpFrom')}</label>
            <input
              value={form.smtpFrom ?? ''}
              onChange={(e) => set('smtpFrom', e.target.value)}
              placeholder="Mise <noreply@example.com>"
              className="admin-input"
            />
          </div>
          <div>
            <label className="admin-label">{t('admin.settings.appUrl')}</label>
            <input
              value={form.appUrl ?? ''}
              onChange={(e) => set('appUrl', e.target.value)}
              placeholder="https://mise.example.com"
              className="admin-input"
            />
          </div>
        </div>
      </div>

      <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn btn--primary">
        {saveMut.isPending ? t('recipe.form.saving') : t('admin.settings.saveBtn')}
      </button>
    </div>
  );
}
