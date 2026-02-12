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
      const todos = await TodoModel.findAllByUser(req.userId);
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
      const { title } = req.body;
      const todoId = await TodoModel.create({ user_id: req.userId, title });
      const todo = await TodoModel.findById(todoId, req.userId);
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
      const todoId = parseInt(req.params.id, 10);
      if (isNaN(todoId)) {
        res.status(400).json({ error: 'Invalid todo ID' });
        return;
      }

      const existing = await TodoModel.findById(todoId, req.userId);
      if (!existing) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }

      const { title, completed } = req.body;
      await TodoModel.update(todoId, req.userId, { title, completed });
      const updated = await TodoModel.findById(todoId, req.userId);
      res.json({ todo: updated });
    } catch (error) {
      console.error('Update todo error:', error);
      res.status(500).json({ error: 'Failed to update todo' });
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const todoId = parseInt(req.params.id, 10);
      if (isNaN(todoId)) {
        res.status(400).json({ error: 'Invalid todo ID' });
        return;
      }

      const deleted = await TodoModel.delete(todoId, req.userId);
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
