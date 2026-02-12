import { Router } from 'express';
import { TodoController } from '../controllers';
import {
  authMiddleware,
  createTodoValidation,
  updateTodoValidation,
} from '../middleware';

const router = Router();

// All todo routes require authentication
router.use(authMiddleware);

router.get('/', TodoController.list);
router.post('/', createTodoValidation, TodoController.create);
router.patch('/:id', updateTodoValidation, TodoController.update);
router.delete('/:id', TodoController.delete);

export default router;
