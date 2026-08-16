import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/admin';
import { useToast } from '../store/toastStore';

function inviteLink(token: string): string {
  return `${window.location.origin}/register?invite=${token}`;
}

export default function AdminInvitesTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [days, setDays] = useState('7');
  const [newInvite, setNewInvite] = useState<{ token: string } | null>(null);

  const {
    data: invites,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: adminApi.listInvites,
  });

  const parsedDays = Number(days);
  const isDaysValid = days.trim() !== '' && Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 30;

  const createMut = useMutation({
    mutationFn: () => adminApi.createInvite({ email: email || undefined, expiresInDays: parsedDays }),
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
          <button type="button" onClick={() => createMut.mutate()} disabled={createMut.isPending || !isDaysValid}>
            {t('admin.invites.generateBtn')}
          </button>
        </div>

        {newInvite && (
          <div className="invite-link-box">
            <p className="invite-ready-label">{t('admin.invites.linkReady')}</p>
            <code className="invite-code">{inviteLink(newInvite.token)}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(inviteLink(newInvite.token)).then(
                  () => toast.success(t('admin.invites.copied')),
                  () => toast.error(t('admin.invites.copyError')),
                );
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
      ) : isError ? (
        <p className="admin-error">{t('admin.invites.loadError')}</p>
      ) : (
        <div>
          <p className="admin-stat">
            {invites?.length ?? 0} {t('admin.invites.active')}
          </p>
          {invites?.map((inv) => (
            <div key={inv._id} className="invite-row">
              <div>
                <code className="invite-row-code">{inviteLink(inv.token)}</code>
                {inv.email && <span className="invite-row-meta">({inv.email})</span>}
                <span className="invite-row-expires">
                  {t('admin.invites.expires')}: {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => deleteMut.mutate(inv._id)}
                className="btn-danger"
                title={t('admin.invites.revoke')}
                aria-label={t('admin.invites.revoke')}
              >
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
