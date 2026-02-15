import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Category {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: Date;
}

export interface CreateCategoryData {
  user_id: number;
  name: string;
  color?: string;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string;
}

export const CategoryModel = {
  async findAllByUser(userId: number): Promise<Category[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );
    return rows as Category[];
  },

  async findById(id: number, userId: number): Promise<Category | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows.length > 0 ? (rows[0] as Category) : null;
  },

  async create(data: CreateCategoryData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)',
      [data.user_id, data.name, data.color || '#6b7280']
    );
    return result.insertId;
  },

  async update(id: number, userId: number, data: UpdateCategoryData): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) {
      fields.push('color = ?');
      values.push(data.color);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  },
};
