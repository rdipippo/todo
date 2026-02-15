import api from './api';

export interface Category {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface CreateCategoryData {
  name: string;
  color?: string;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string;
}

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const response = await api.get<{ categories: Category[] }>('/categories');
    return response.data.categories;
  },

  async createCategory(data: CreateCategoryData): Promise<Category> {
    const response = await api.post<{ category: Category }>('/categories', data);
    return response.data.category;
  },

  async updateCategory(id: number, data: UpdateCategoryData): Promise<Category> {
    const response = await api.patch<{ category: Category }>(`/categories/${id}`, data);
    return response.data.category;
  },

  async deleteCategory(id: number): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};

export default categoryService;
