import { api } from './client';

export interface AuthResponse {
  access_token: string;
  user: { id: string; email: string; displayName?: string; role?: string };
}

export interface VerificationResponse {
  needsVerification: true;
  email: string;
  devLink?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (email: string, password: string, displayName?: string, inviteToken?: string) =>
    api
      .post<AuthResponse | VerificationResponse>('/auth/register', { email, password, displayName, inviteToken })
      .then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  forgotPassword: (email: string) =>
    api.post<{ message: string; devLink?: string }>('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }).then((r) => r.data),
  verifyEmail: (token: string) =>
    api.get<AuthResponse>('/auth/verify-email', { params: { token } }).then((r) => r.data),
};
