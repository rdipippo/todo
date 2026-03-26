import { Router } from 'express';
import { CategoryController } from '../controllers';
import {
  authMiddleware,
  createCategoryValidation,
  updateCategoryValidation,
} from '../middleware';

const router = Router();

// All category routes require authentication
router.use(authMiddleware);

router.get('/', CategoryController.list);
router.post('/', createCategoryValidation, CategoryController.create);
router.patch('/:id', updateCategoryValidation, CategoryController.update);
router.delete('/:id', CategoryController.delete);

export default router;
