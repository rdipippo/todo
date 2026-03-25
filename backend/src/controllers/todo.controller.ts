import { Response } from 'express';
import { TodoModel } from '../models';
import { AuthRequest } from '../middleware';

export const TodoController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const effectiveUserId = req.effectiveUserId ?? req.userId;
      const todos = await TodoModel.findAllByUser(effectiveUserId);
      res.json({ todos });
    } catch (error) {
      console.error('List todos error:', error);
      res.status(500).json({ error: 'Failed to retrieve todos' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      if (!req.permCreateTasks) {
        res.status(403).json({ error: 'You do not have permission to create tasks' });
        return;
      }
      const effectiveUserId = req.effectiveUserId ?? req.userId;
      const { title, category_id } = req.body;
      const todoId = await TodoModel.create({ user_id: effectiveUserId, title, category_id });
      const todo = await TodoModel.findById(todoId, effectiveUserId);
      res.status(201).json({ todo });
    } catch (error) {
      console.error('Create todo error:', error);
      res.status(500).json({ error: 'Failed to create todo' });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const effectiveUserId = req.effectiveUserId ?? req.userId;
      const todoId = parseInt(req.params.id, 10);
      if (isNaN(todoId)) {
        res.status(400).json({ error: 'Invalid todo ID' });
        return;
      }

      const existing = await TodoModel.findById(todoId, effectiveUserId);
      if (!existing) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }

      const { title, completed, percent_complete, category_id } = req.body;

      const isEditingContent = title !== undefined || completed !== undefined || percent_complete !== undefined;
      const isAssigning = category_id !== undefined;

      if (isEditingContent && !req.permEditTasks) {
        res.status(403).json({ error: 'You do not have permission to edit tasks' });
        return;
      }
      if (isAssigning && !req.permAssignTasks) {
        res.status(403).json({ error: 'You do not have permission to assign tasks to categories' });
        return;
      }

      await TodoModel.update(todoId, effectiveUserId, { title, completed, percent_complete, category_id });
      const updated = await TodoModel.findById(todoId, effectiveUserId);
      res.json({ todo: updated });
    } catch (error) {
      console.error('Update todo error:', error);
      res.status(500).json({ error: 'Failed to update todo' });
    }
  },

  async reorder(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      if (!req.permEditTasks) {
        res.status(403).json({ error: 'You do not have permission to reorder tasks' });
        return;
      }
      const effectiveUserId = req.effectiveUserId ?? req.userId;
      const { todoIds } = req.body;
      await TodoModel.reorder(effectiveUserId, todoIds);
      res.json({ message: 'Todos reordered successfully' });
    } catch (error) {
      console.error('Reorder todos error:', error);
      res.status(500).json({ error: 'Failed to reorder todos' });
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      if (!req.permDeleteTasks) {
        res.status(403).json({ error: 'You do not have permission to delete tasks' });
        return;
      }
      const effectiveUserId = req.effectiveUserId ?? req.userId;
      const todoId = parseInt(req.params.id, 10);
      if (isNaN(todoId)) {
        res.status(400).json({ error: 'Invalid todo ID' });
        return;
      }

      const deleted = await TodoModel.delete(todoId, effectiveUserId);
      if (!deleted) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }
      res.json({ message: 'Todo deleted successfully' });
    } catch (error) {
      console.error('Delete todo error:', error);
      res.status(500).json({ error: 'Failed to delete todo' });
    }
  },
};
