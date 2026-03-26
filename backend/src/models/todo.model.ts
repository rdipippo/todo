import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Todo {
  id: number;
  user_id: number;
  category_id: number | null;
  title: string;
  completed: boolean;
  percent_complete: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTodoData {
  user_id: number;
  title: string;
  category_id?: number | null;
  percent_complete?: number;
}

export interface UpdateTodoData {
  title?: string;
  completed?: boolean;
  percent_complete?: number;
  category_id?: number | null;
}

export const TodoModel = {
  async findAllByUser(userId: number): Promise<Todo[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM todos WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC',
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
    const [maxRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM todos WHERE user_id = ?',
      [data.user_id]
    );
    const nextOrder = (maxRows[0] as { next_order: number }).next_order;

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO todos (user_id, title, category_id, sort_order, percent_complete) VALUES (?, ?, ?, ?, ?)',
      [data.user_id, data.title, data.category_id ?? null, nextOrder, data.percent_complete ?? 0]
    );
    return result.insertId;
  },

  async update(id: number, userId: number, data: UpdateTodoData): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | boolean | number | null)[] = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.completed !== undefined) {
      fields.push('completed = ?');
      values.push(data.completed);
    }
    if (data.percent_complete !== undefined) {
      fields.push('percent_complete = ?');
      values.push(data.percent_complete);
    }
    if (data.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(data.category_id as number | null);
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

  async reorder(userId: number, todoIds: number[]): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < todoIds.length; i++) {
        await conn.execute(
          'UPDATE todos SET sort_order = ? WHERE id = ? AND user_id = ?',
          [i, todoIds[i], userId]
        );
      }
      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};
