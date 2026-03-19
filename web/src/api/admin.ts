import { api } from './client';

export interface AdminUser {
  _id: string;
  email: string;
  displayName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface AppSettings {
  allowRegistration: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  appUrl?: string;
  siteTitle?: string;
}

export interface Invite {
  _id: string;
  token: string;
  email?: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export const adminApi = {
  getPublicSettings: () => api.get<{ siteTitle: string }>('/admin/settings/public').then((r) => r.data),

  setupStatus: () => api.get<{ setupDone: boolean }>('/admin/setup').then((r) => r.data),
  setup: (email: string, password: string, displayName?: string) =>
    api.post('/admin/setup', { email, password, displayName }).then((r) => r.data),

  getSettings: () => api.get<AppSettings>('/admin/settings').then((r) => r.data),
  updateSettings: (data: Partial<AppSettings>) => api.patch<AppSettings>('/admin/settings', data).then((r) => r.data),

  listUsers: () => api.get<AdminUser[]>('/admin/users').then((r) => r.data),
  updateUser: (id: string, data: { isActive?: boolean; role?: string }) =>
    api.patch<AdminUser>(`/admin/users/${id}`, data).then((r) => r.data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`).then((r) => r.data),

  listInvites: () => api.get<Invite[]>('/admin/invites').then((r) => r.data),
  createInvite: (data: { email?: string; expiresInDays?: number }) =>
    api.post<Invite>('/admin/invites', data).then((r) => r.data),
  deleteInvite: (id: string) => api.delete(`/admin/invites/${id}`).then((r) => r.data),
};
