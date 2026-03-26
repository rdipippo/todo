import { Router } from 'express';
import { TodoController } from '../controllers';
import {
  authMiddleware,
  createTodoValidation,
  updateTodoValidation,
  reorderTodosValidation,
} from '../middleware';

const router = Router();

// All todo routes require authentication
router.use(authMiddleware);

router.get('/', TodoController.list);
router.post('/', createTodoValidation, TodoController.create);
router.put('/reorder', reorderTodosValidation, TodoController.reorder);
router.patch('/:id', updateTodoValidation, TodoController.update);
router.delete('/:id', TodoController.delete);

export default router;
