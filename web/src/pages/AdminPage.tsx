import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { AppSettings } from '../api/admin';
import { adminApi } from '../api/admin';
import ConfirmDialog from '../components/ConfirmDialog';
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
        <h1 className="admin-page-title">{t('admin.title')}</h1>
        <Link to="/" className="link--sm">
          {t('recipe.detail.back')}
        </Link>
      </div>

      <div className="tab-bar">
        {(['users', 'invites', 'settings'] as Tab[]).map((t2) => (
          <button
            type="button"
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      <p className="admin-stat">
        {users?.length ?? 0} {t('admin.users.total')}
      </p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t('auth.email')}</th>
            <th>{t('admin.users.name')}</th>
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
                  aria-label={t('admin.users.role')}
                  value={u.role}
                  onChange={(e) => updateMut.mutate({ id: u._id, data: { role: e.target.value } })}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => updateMut.mutate({ id: u._id, data: { isActive: !u.isActive } })}
                  className={`badge badge--${u.isActive ? 'active' : 'blocked'}`}
                >
                  {u.isActive ? t('admin.users.active') : t('admin.users.blocked')}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(u._id)}
                  className="btn-danger"
                  title={t('recipe.detail.delete')}
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {confirmDeleteId && (
        <ConfirmDialog
          message={t('admin.users.confirmDelete')}
          confirmLabel={t('recipe.detail.deleteConfirmBtn')}
          cancelLabel={t('recipe.detail.deleteCancel')}
          onConfirm={() => {
            deleteMut.mutate(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
          isPending={deleteMut.isPending}
        />
      )}
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
        <h3>{t('admin.invites.create')}</h3>
        <div className="invite-create-row">
          <div>
            <label className="admin-label" htmlFor="inv-email">
              {t('auth.email')} ({t('admin.invites.emailOptional')})
            </label>
            <input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="inv-days">
              {t('admin.invites.expiresInDays')}
            </label>
            <input
              id="inv-days"
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="input--narrow"
            />
          </div>
          <button type="button" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            {t('admin.invites.generateBtn')}
          </button>
        </div>

        {newInvite && (
          <div className="invite-link-box">
            <p className="invite-ready-label">{t('admin.invites.linkReady')}</p>
            <code className="invite-code">
              {appUrl}/register?invite={newInvite.token}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(`${appUrl}/register?invite=${newInvite.token}`);
                toast.success(t('admin.invites.copied'));
              }}
              className="outline btn-sm invite-copy-btn"
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
          <p className="admin-stat">
            {invites?.length ?? 0} {t('admin.invites.active')}
          </p>
          {invites?.map((inv) => (
            <div key={inv._id} className="invite-row">
              <div>
                <code className="invite-row-code">
                  {appUrl}/register?invite={inv.token}
                </code>
                {inv.email && <span className="invite-row-meta">({inv.email})</span>}
                <span className="invite-row-expires">
                  {t('admin.invites.expires')}: {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <button type="button" onClick={() => deleteMut.mutate(inv._id)} className="btn-danger">
                🗑
              </button>
            </div>
          ))}
          {invites?.length === 0 && <p className="admin-empty">{t('admin.invites.empty')}</p>}
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
    <div className="admin-section--narrow">
      <div className="admin-section">
        <h3>{t('admin.settings.general')}</h3>
        <div>
          <label className="admin-label" htmlFor="s-siteTitle">
            {t('admin.settings.siteTitle')}
          </label>
          <input
            id="s-siteTitle"
            value={form.siteTitle ?? ''}
            onChange={(e) => set('siteTitle', e.target.value)}
            placeholder="Mise"
          />
        </div>
      </div>

      <div className="admin-section">
        <h3>{t('admin.settings.registration')}</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.allowRegistration ?? true}
            onChange={(e) => set('allowRegistration', e.target.checked)}
          />
          {t('admin.settings.allowRegistration')}
        </label>
      </div>

      <div className="admin-section">
        <h3>{t('admin.settings.smtp')}</h3>
        <p className="admin-hint">{t('admin.settings.smtpHint')}</p>
        <div className="admin-form-stack">
          <div className="grid-2">
            <div>
              <label className="admin-label" htmlFor="s-smtpHost">
                {t('admin.settings.smtpHost')}
              </label>
              <input
                id="s-smtpHost"
                value={form.smtpHost ?? ''}
                onChange={(e) => set('smtpHost', e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="s-smtpPort">
                {t('admin.settings.smtpPort')}
              </label>
              <input
                id="s-smtpPort"
                type="number"
                value={form.smtpPort ?? ''}
                onChange={(e) => set('smtpPort', Number(e.target.value))}
                placeholder="587"
              />
            </div>
          </div>
          <div>
            <label className="admin-label" htmlFor="s-smtpUser">
              {t('admin.settings.smtpUser')}
            </label>
            <input
              id="s-smtpUser"
              value={form.smtpUser ?? ''}
              onChange={(e) => set('smtpUser', e.target.value)}
              placeholder="noreply@example.com"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="s-smtpPass">
              {t('admin.settings.smtpPass')}
            </label>
            <input
              id="s-smtpPass"
              type="password"
              value={form.smtpPass ?? ''}
              onChange={(e) => set('smtpPass', e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="s-smtpFrom">
              {t('admin.settings.smtpFrom')}
            </label>
            <input
              id="s-smtpFrom"
              value={form.smtpFrom ?? ''}
              onChange={(e) => set('smtpFrom', e.target.value)}
              placeholder="Mise <noreply@example.com>"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="s-appUrl">
              {t('admin.settings.appUrl')}
            </label>
            <input
              id="s-appUrl"
              value={form.appUrl ?? ''}
              onChange={(e) => set('appUrl', e.target.value)}
              placeholder="https://mise.example.com"
            />
          </div>
        </div>
      </div>

      <button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
        {saveMut.isPending ? t('recipe.form.saving') : t('admin.settings.saveBtn')}
      </button>
    </div>
  );
}
