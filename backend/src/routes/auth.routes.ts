import { Router } from 'express';
import { AuthController } from '../controllers';
import {
  authMiddleware,
  canManageMiddleware,
  authLimiter,
  passwordResetLimiter,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  inviteValidation,
} from '../middleware';

const router = Router();

// Public routes
router.post('/register', authLimiter, registerValidation, AuthController.register);
router.post('/login', authLimiter, loginValidation, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, AuthController.resetPassword);
router.get('/verify-email/:token', AuthController.verifyEmail);
router.post('/resend-verification', authLimiter, forgotPasswordValidation, AuthController.resendVerification);
router.get('/invite/:token', AuthController.checkInvite);

// Protected routes
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/me', authMiddleware, AuthController.me);
router.post('/change-password', authMiddleware, authLimiter, changePasswordValidation, AuthController.changePassword);
router.post('/invite', authMiddleware, canManageMiddleware, inviteValidation, AuthController.sendInvite);
router.get('/group', authMiddleware, AuthController.getGroupInfo);
router.delete('/group/members/:userId', authMiddleware, canManageMiddleware, AuthController.removeGroupMember);

export default router;
