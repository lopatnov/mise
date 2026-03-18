import { api } from './client';

export interface Category { _id: string; name: string; icon?: string; }

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then((r) => r.data),
};
