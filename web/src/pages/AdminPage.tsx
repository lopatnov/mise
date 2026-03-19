import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/admin';
import type { AppSettings } from '../api/admin';
import { useToast } from '../store/toastStore';

type Tab = 'users' | 'invites' | 'settings';

export default function AdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>{t('admin.title')}</h1>
        <Link to="/" style={{ fontSize: 14, color: '#2d6a4f' }}>← {t('recipe.detail.back')}</Link>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #eee' }}>
        {(['users', 'invites', 'settings'] as Tab[]).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            style={{
              padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === t2 ? 600 : 400, color: tab === t2 ? '#2d6a4f' : '#888',
              borderBottom: tab === t2 ? '2px solid #2d6a4f' : '2px solid transparent',
              marginBottom: -2,
            }}
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success(t('admin.users.updated')); },
    onError: () => toast.error(t('admin.users.updateError')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success(t('admin.users.deleted')); },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? t('admin.users.deleteError'));
    },
  });

  if (isLoading) return <p>{t('recipe.list.loading')}</p>;

  return (
    <div>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>{users?.length ?? 0} {t('admin.users.total')}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
            <th style={th}>{t('auth.email')}</th>
            <th style={th}>{t('auth.name')}</th>
            <th style={th}>{t('admin.users.role')}</th>
            <th style={th}>{t('admin.users.status')}</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={td}>{u.email}</td>
              <td style={td}>{u.displayName ?? '—'}</td>
              <td style={td}>
                <select
                  value={u.role}
                  onChange={(e) => updateMut.mutate({ id: u._id, data: { role: e.target.value } })}
                  style={{ fontSize: 13, padding: '2px 6px', borderRadius: 4, border: '1px solid #ddd' }}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td style={td}>
                <button
                  onClick={() => updateMut.mutate({ id: u._id, data: { isActive: !u.isActive } })}
                  style={{
                    padding: '3px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12,
                    background: u.isActive ? '#e8f5e9' : '#fdecea',
                    color: u.isActive ? '#2d6a4f' : '#c62828',
                  }}
                >
                  {u.isActive ? t('admin.users.active') : t('admin.users.blocked')}
                </button>
              </td>
              <td style={td}>
                <button
                  onClick={() => { if (confirm(t('admin.users.confirmDelete'))) deleteMut.mutate(u._id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c62828', fontSize: 16 }}
                  title={t('recipe.detail.delete')}
                >🗑</button>
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'invites'] }); toast.success(t('admin.invites.revoked')); },
    onError: () => toast.error(t('admin.invites.revokeError')),
  });

  const appUrl = window.location.origin;

  return (
    <div>
      <div style={{ background: '#f9f9f7', borderRadius: 10, padding: '16px', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>{t('admin.invites.create')}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>{t('auth.email')} ({t('admin.invites.emailOptional')})</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{ ...inputStyle, width: 240 }}
            />
          </div>
          <div>
            <label style={labelStyle}>{t('admin.invites.expiresInDays')}</label>
            <input
              type="number" min={1} max={30} value={days} onChange={(e) => setDays(e.target.value)}
              style={{ ...inputStyle, width: 80 }}
            />
          </div>
          <button onClick={() => createMut.mutate()} disabled={createMut.isPending} style={btnStyle}>
            {t('admin.invites.generateBtn')}
          </button>
        </div>

        {newInvite && (
          <div style={{ marginTop: 16, background: '#e8f5e9', borderRadius: 8, padding: '12px 14px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#2d6a4f' }}>
              {t('admin.invites.linkReady')}
            </p>
            <code style={{ fontSize: 12, wordBreak: 'break-all', color: '#333' }}>
              {appUrl}/register?invite={newInvite.token}
            </code>
            <button
              onClick={() => { void navigator.clipboard.writeText(`${appUrl}/register?invite=${newInvite.token}`); toast.success(t('admin.invites.copied')); }}
              style={{ marginLeft: 12, fontSize: 12, padding: '3px 8px', borderRadius: 4, border: '1px solid #2d6a4f', background: 'none', cursor: 'pointer', color: '#2d6a4f' }}
            >
              {t('admin.invites.copy')}
            </button>
          </div>
        )}
      </div>

      {isLoading ? <p>{t('recipe.list.loading')}</p> : (
        <div>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>{invites?.length ?? 0} {t('admin.invites.active')}</p>
          {invites?.map((inv) => (
            <div key={inv._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
              <div>
                <code style={{ fontSize: 12, color: '#555' }}>{appUrl}/register?invite={inv.token}</code>
                {inv.email && <span style={{ marginLeft: 10, color: '#888' }}>({inv.email})</span>}
                <span style={{ marginLeft: 10, color: '#aaa' }}>
                  {t('admin.invites.expires')}: {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => deleteMut.mutate(inv._id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c62828', fontSize: 16, flexShrink: 0 }}
              >🗑</button>
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

  useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.getSettings,
    onSuccess: (data: AppSettings) => { if (!loaded) { setForm(data); setLoaded(true); } },
  } as Parameters<typeof useQuery>[0]);

  const saveMut = useMutation({
    mutationFn: () => adminApi.updateSettings(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'settings'] }); toast.success(t('admin.settings.saved')); },
    onError: () => toast.error(t('admin.settings.saveError')),
  });

  const set = (key: keyof AppSettings, val: string | boolean | number) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div style={{ maxWidth: 520 }}>
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>{t('admin.settings.registration')}</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
          <input
            type="checkbox"
            checked={form.allowRegistration ?? true}
            onChange={(e) => set('allowRegistration', e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          {t('admin.settings.allowRegistration')}
        </label>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, marginBottom: 4 }}>{t('admin.settings.smtp')}</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{t('admin.settings.smtpHint')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="grid-2">
            <div>
              <label style={labelStyle}>{t('admin.settings.smtpHost')}</label>
              <input value={form.smtpHost ?? ''} onChange={(e) => set('smtpHost', e.target.value)} placeholder="smtp.gmail.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('admin.settings.smtpPort')}</label>
              <input type="number" value={form.smtpPort ?? ''} onChange={(e) => set('smtpPort', Number(e.target.value))} placeholder="587" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t('admin.settings.smtpUser')}</label>
            <input value={form.smtpUser ?? ''} onChange={(e) => set('smtpUser', e.target.value)} placeholder="noreply@example.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('admin.settings.smtpPass')}</label>
            <input type="password" value={form.smtpPass ?? ''} onChange={(e) => set('smtpPass', e.target.value)} placeholder="••••••••" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('admin.settings.smtpFrom')}</label>
            <input value={form.smtpFrom ?? ''} onChange={(e) => set('smtpFrom', e.target.value)} placeholder="Mise <noreply@example.com>" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('admin.settings.appUrl')}</label>
            <input value={form.appUrl ?? ''} onChange={(e) => set('appUrl', e.target.value)} placeholder="https://mise.example.com" style={inputStyle} />
          </div>
        </div>
      </section>

      <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} style={btnStyle}>
        {saveMut.isPending ? t('recipe.form.saving') : t('admin.settings.saveBtn')}
      </button>
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: 13, color: '#666' };
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 4 };
const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 7, border: '1px solid #ddd', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const btnStyle: React.CSSProperties = { padding: '10px 22px', borderRadius: 8, background: '#2d6a4f', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer' };
