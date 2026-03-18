import { api } from './client';

export interface AuthResponse {
  access_token: string;
  user: { id: string; email: string; displayName?: string };
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (email: string, password: string, displayName?: string) =>
    api.post<AuthResponse>('/auth/register', { email, password, displayName }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};
