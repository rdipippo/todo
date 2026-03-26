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
      const effectiveUserId = req.effectiveUserId ?? req.userId;
      const categories = await CategoryModel.findAllByUser(effectiveUserId);
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
      const effectiveUserId = req.effectiveUserId ?? req.userId;
      const { name, color } = req.body;
      const categoryId = await CategoryModel.create({ user_id: effectiveUserId, name, color });
      const category = await CategoryModel.findById(categoryId, effectiveUserId);
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
      const effectiveUserId = req.effectiveUserId ?? req.userId;
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        res.status(400).json({ error: 'Invalid category ID' });
        return;
      }

      const existing = await CategoryModel.findById(categoryId, effectiveUserId);
      if (!existing) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      const { name, color } = req.body;
      await CategoryModel.update(categoryId, effectiveUserId, { name, color });
      const updated = await CategoryModel.findById(categoryId, effectiveUserId);
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
      const effectiveUserId = req.effectiveUserId ?? req.userId;
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        res.status(400).json({ error: 'Invalid category ID' });
        return;
      }

      const deleted = await CategoryModel.delete(categoryId, effectiveUserId);
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
