import { api } from './client';

export interface Ingredient { name: string; amount: number; unit: string; }
export interface Step { order: number; text: string; }
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
}

export const recipesApi = {
  list: (query?: RecipeQuery) =>
    api.get<RecipesPage>('/recipes', { params: query }).then((r) => r.data),
  get: (id: string) =>
    api.get<Recipe>(`/recipes/${id}`).then((r) => r.data),
  create: (data: Partial<Recipe>) =>
    api.post<Recipe>('/recipes', data).then((r) => r.data),
  update: (id: string, data: Partial<Recipe>) =>
    api.patch<Recipe>(`/recipes/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/recipes/${id}`).then((r) => r.data),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post<Recipe>(`/recipes/${id}/photo`, form).then((r) => r.data);
  },
};
