import { api } from './client';

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}
export interface Step {
  order: number;
  text: string;
  photoUrl?: string;
}
export interface Recipe {
  _id: string;
  title: string;
  description?: string;
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  categoryId?: string;
  rating?: number;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  photoUrl?: string;
  isPublic?: boolean;
  authorId?: string;
  savedBy?: string[];
  createdAt: string;
}

export interface RecipesPage {
  items: Recipe[];
  total: number;
  page: number;
  limit: number;
}

export interface RecipeQuery {
  q?: string;
  tag?: string;
  category?: string;
  page?: number;
  limit?: number;
  mine?: boolean;
  saved?: boolean;
}

export const recipesApi = {
  list: (query?: RecipeQuery) => api.get<RecipesPage>('/recipes', { params: query }).then((r) => r.data),
  get: (id: string) => api.get<Recipe>(`/recipes/${id}`).then((r) => r.data),
  create: (data: Partial<Recipe>) => api.post<Recipe>('/recipes', data).then((r) => r.data),
  update: (id: string, data: Partial<Recipe>) => api.patch<Recipe>(`/recipes/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/recipes/${id}`).then((r) => r.data),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post<Recipe>(`/recipes/${id}/photo`, form).then((r) => r.data);
  },
  listPublic: (query?: RecipeQuery) => api.get<RecipesPage>('/recipes/public', { params: query }).then((r) => r.data),
  getTags: () => api.get<string[]>('/recipes/tags').then((r) => r.data),
  uploadStepPhoto: (id: string, order: number, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post<Recipe>(`/recipes/${id}/steps/${order}/photo`, form).then((r) => r.data);
  },
  addFavorite: (id: string) => api.post<{ saved: boolean }>(`/recipes/${id}/favorite`).then((r) => r.data),
  removeFavorite: (id: string) => api.delete<{ saved: boolean }>(`/recipes/${id}/favorite`).then((r) => r.data),
  importFromUrl: (url: string) => api.post<Partial<Recipe>>('/recipes/import-url', { url }).then((r) => r.data),
};
