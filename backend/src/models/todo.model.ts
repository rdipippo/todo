import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTodoData {
  user_id: number;
  title: string;
}

export interface UpdateTodoData {
  title?: string;
  completed?: boolean;
}

export const TodoModel = {
  async findAllByUser(userId: number): Promise<Todo[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );
    return rows as Todo[];
  },

  async findById(id: number, userId: number): Promise<Todo | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM todos WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows.length > 0 ? (rows[0] as Todo) : null;
  },

  async create(data: CreateTodoData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO todos (user_id, title) VALUES (?, ?)',
      [data.user_id, data.title]
    );
    return result.insertId;
  },

  async update(id: number, userId: number, data: UpdateTodoData): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | boolean | number)[] = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.completed !== undefined) {
      fields.push('completed = ?');
      values.push(data.completed);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM todos WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  },
};
