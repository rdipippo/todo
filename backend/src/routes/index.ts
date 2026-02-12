import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import todoRoutes from './todo.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/todos', todoRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
