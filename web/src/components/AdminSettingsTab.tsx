import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '../api/admin';
import { adminApi } from '../api/admin';
import { useToast } from '../store/toastStore';

export default function AdminSettingsTab() {
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
