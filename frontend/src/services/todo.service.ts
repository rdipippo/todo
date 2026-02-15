import api from './api';

export interface Todo {
  id: number;
  user_id: number;
  category_id: number | null;
  title: string;
  completed: boolean;
  percent_complete: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoData {
  title: string;
  category_id?: number | null;
}

export interface UpdateTodoData {
  title?: string;
  completed?: boolean;
  percent_complete?: number;
  category_id?: number | null;
}

export const todoService = {
  async getTodos(): Promise<Todo[]> {
    const response = await api.get<{ todos: Todo[] }>('/todos');
    return response.data.todos;
  },

  async createTodo(data: CreateTodoData): Promise<Todo> {
    const response = await api.post<{ todo: Todo }>('/todos', data);
    return response.data.todo;
  },

  async updateTodo(id: number, data: UpdateTodoData): Promise<Todo> {
    const response = await api.patch<{ todo: Todo }>(`/todos/${id}`, data);
    return response.data.todo;
  },

  async deleteTodo(id: number): Promise<void> {
    await api.delete(`/todos/${id}`);
  },

  async reorderTodos(todoIds: number[]): Promise<void> {
    await api.put('/todos/reorder', { todoIds });
  },
};

export default todoService;
