import axios from 'axios';
import { queryClient } from '../queryClient';
import { useAuthStore } from '../store/authStore';

const host = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export const api = axios.create({
  baseURL: `${host}/api`,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      queryClient.clear();
    }
    return Promise.reject(err);
  },
);
