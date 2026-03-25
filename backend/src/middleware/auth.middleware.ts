import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services';
import { UserModel } from '../models';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRole?: string;
  effectiveUserId?: number;
  canManageGroup?: boolean;
  permCreateTasks?: boolean;
  permEditTasks?: boolean;
  permDeleteTasks?: boolean;
  permAssignTasks?: boolean;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = TokenService.verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Verify user still exists and is enabled
  const user = await UserModel.findById(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  if (!user.enabled) {
    res.status(403).json({ error: 'Account is disabled' });
    return;
  }

  req.userId = payload.userId;
  req.userEmail = payload.email;
  req.userRole = payload.role;
  req.effectiveUserId = user.group_owner_id ?? user.id;
  req.canManageGroup = !user.group_owner_id || user.group_can_manage;
  // Group owners always have all task permissions; members respect their per-member settings
  const isMember = !!user.group_owner_id;
  req.permCreateTasks = !isMember || user.perm_create_tasks;
  req.permEditTasks   = !isMember || user.perm_edit_tasks;
  req.permDeleteTasks = !isMember || user.perm_delete_tasks;
  req.permAssignTasks = !isMember || user.perm_assign_tasks;

  next();
};

export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = TokenService.verifyAccessToken(token);

    if (payload) {
      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.userRole = payload.role;
    }
  }

  next();
};

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

export const superAdminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== 'super_admin') {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }
  next();
};

export const canManageMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.canManageGroup) {
    res.status(403).json({ error: 'Group management access required' });
    return;
  }
  next();
};
