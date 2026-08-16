import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/admin';
import { useToast } from '../store/toastStore';
import ConfirmDialog from './ConfirmDialog';

export default function AdminUsersTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery({
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
  if (isError) return <p className="admin-error">{t('admin.users.loadError')}</p>;

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
                  aria-label={t('recipe.detail.delete')}
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
