import api from './api';

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoData {
  title: string;
}

export interface UpdateTodoData {
  title?: string;
  completed?: boolean;
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
};

export default todoService;
