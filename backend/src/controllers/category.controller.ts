import { Response } from 'express';
import { CategoryModel } from '../models';
import { AuthRequest } from '../middleware';

export const CategoryController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const categories = await CategoryModel.findAllByUser(req.userId);
      res.json({ categories });
    } catch (error) {
      console.error('List categories error:', error);
      res.status(500).json({ error: 'Failed to retrieve categories' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const { name, color } = req.body;
      const categoryId = await CategoryModel.create({ user_id: req.userId, name, color });
      const category = await CategoryModel.findById(categoryId, req.userId);
      res.status(201).json({ category });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'ER_DUP_ENTRY') {
        res.status(409).json({ error: 'A category with this name already exists' });
        return;
      }
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        res.status(400).json({ error: 'Invalid category ID' });
        return;
      }

      const existing = await CategoryModel.findById(categoryId, req.userId);
      if (!existing) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      const { name, color } = req.body;
      await CategoryModel.update(categoryId, req.userId, { name, color });
      const updated = await CategoryModel.findById(categoryId, req.userId);
      res.json({ category: updated });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'ER_DUP_ENTRY') {
        res.status(409).json({ error: 'A category with this name already exists' });
        return;
      }
      console.error('Update category error:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        res.status(400).json({ error: 'Invalid category ID' });
        return;
      }

      const deleted = await CategoryModel.delete(categoryId, req.userId);
      if (!deleted) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  },
};
