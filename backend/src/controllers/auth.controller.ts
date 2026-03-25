import { Request, Response } from 'express';
import { UserModel, InvitationModel } from '../models';
import { PasswordService, TokenService, EmailService } from '../services';
import { AuthRequest } from '../middleware';

export const AuthController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, inviteToken } = req.body;

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: 'An account with this email already exists' });
        return;
      }

      // Verify invite token if provided
      let inviteData: {
        invitationId: number;
        groupOwnerId: number;
        canManage: boolean;
        permCreateTasks: boolean;
        permEditTasks: boolean;
        permDeleteTasks: boolean;
        permAssignTasks: boolean;
      } | null = null;
      if (inviteToken) {
        const verified = await TokenService.verifyInvitationToken(inviteToken);
        if (!verified) {
          res.status(400).json({ error: 'Invalid or expired invitation token' });
          return;
        }
        // Ensure email matches the invite
        if (verified.email !== email.toLowerCase()) {
          res.status(400).json({ error: 'Email does not match the invitation' });
          return;
        }
        inviteData = {
          invitationId: verified.invitationId,
          groupOwnerId: verified.groupOwnerId,
          canManage: verified.canManage,
          permCreateTasks: verified.permCreateTasks,
          permEditTasks: verified.permEditTasks,
          permDeleteTasks: verified.permDeleteTasks,
          permAssignTasks: verified.permAssignTasks,
        };
      }

      // Hash password and create user
      const passwordHash = await PasswordService.hash(password);
      const userId = await UserModel.create({
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
      });

      // Apply group membership from invite
      if (inviteData) {
        await UserModel.setGroupOwner(
          userId,
          inviteData.groupOwnerId,
          inviteData.canManage,
          inviteData.permCreateTasks,
          inviteData.permEditTasks,
          inviteData.permDeleteTasks,
          inviteData.permAssignTasks
        );
        await InvitationModel.markAsUsed(inviteData.invitationId);
      }

      // Generate email verification token and send email
      const verificationToken = await TokenService.generateEmailVerificationToken(userId);
      await EmailService.sendVerificationEmail(email, verificationToken, firstName);

      res.status(201).json({
        message: 'Account created successfully. Please check your email to verify your account.',
        userId,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, rememberMe } = req.body;

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Verify password
      const isValidPassword = await PasswordService.verify(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Check if email is verified
      if (!user.email_verified) {
        res.status(403).json({
          error: 'Please verify your email before logging in',
          code: 'EMAIL_NOT_VERIFIED',
        });
        return;
      }

      // Check if account is enabled
      if (!user.enabled) {
        res.status(403).json({
          error: 'Your account has been disabled',
          code: 'ACCOUNT_DISABLED',
        });
        return;
      }

      // Generate tokens
      const tokens = await TokenService.generateTokenPair(user.id, user.email, user.role);

      // Set refresh token in HTTP-only cookie for web clients
      const cookieMaxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: cookieMaxAge,
      });

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken, // Also return for mobile clients
        user: UserModel.toPublic(user),
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  },

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        const tokenData = await TokenService.verifyRefreshToken(refreshToken);
        if (tokenData) {
          await TokenService.revokeRefreshToken(tokenData.tokenId);
        }
      }

      // Clear cookie
      res.clearCookie('refreshToken');

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      // Try to get refresh token from body or cookie
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token is required' });
        return;
      }

      const tokenData = await TokenService.verifyRefreshToken(refreshToken);
      if (!tokenData) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
      }

      // Get user
      const user = await UserModel.findById(tokenData.userId);
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Check if account is enabled
      if (!user.enabled) {
        res.status(403).json({ error: 'Account is disabled' });
        return;
      }

      // Revoke old refresh token and generate new token pair
      await TokenService.revokeRefreshToken(tokenData.tokenId);
      const tokens = await TokenService.generateTokenPair(user.id, user.email, user.role);

      // Update cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Always return success to prevent email enumeration
      const successMessage = 'If an account with this email exists, a password reset link has been sent.';

      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.json({ message: successMessage });
        return;
      }

      // Generate reset token and send email
      const resetToken = await TokenService.generatePasswordResetToken(user.id);
      await EmailService.sendPasswordResetEmail(email, resetToken, user.first_name || undefined);

      res.json({ message: successMessage });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      // Verify reset token
      const tokenData = await TokenService.verifyPasswordResetToken(token);
      if (!tokenData) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      // Hash new password and update user
      const passwordHash = await PasswordService.hash(password);
      await UserModel.updatePassword(tokenData.userId, passwordHash);

      // Mark token as used
      await TokenService.markPasswordResetTokenAsUsed(tokenData.tokenId);

      // Revoke all refresh tokens for security
      await TokenService.revokeAllUserRefreshTokens(tokenData.userId);

      res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  },

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      // Verify email token
      const tokenData = await TokenService.verifyEmailToken(token);
      if (!tokenData) {
        res.status(400).json({
          error: 'Invalid or expired verification link',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      // Verify user's email
      await UserModel.verifyEmail(tokenData.userId);

      // Mark token as used
      await TokenService.markEmailTokenAsUsed(tokenData.tokenId);

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ error: 'Failed to verify email' });
    }
  },

  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        res.json({ message: 'If the email exists and is not verified, a new verification email has been sent.' });
        return;
      }

      if (user.email_verified) {
        res.status(400).json({ error: 'Email is already verified' });
        return;
      }

      // Generate new verification token and send email
      const verificationToken = await TokenService.generateEmailVerificationToken(user.id);
      await EmailService.sendVerificationEmail(email, verificationToken, user.first_name || undefined);

      res.json({ message: 'If the email exists and is not verified, a new verification email has been sent.' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  },

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await UserModel.findById(req.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user: UserModel.toPublic(user) });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  },

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password hash
      const user = await UserModel.findById(req.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify current password
      const isValidPassword = await PasswordService.verify(currentPassword, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      // Hash new password and update
      const passwordHash = await PasswordService.hash(newPassword);
      await UserModel.updatePassword(req.userId, passwordHash);

      // Revoke all refresh tokens for security
      await TokenService.revokeAllUserRefreshTokens(req.userId);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  },

  async sendInvite(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId || !req.effectiveUserId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const {
        email,
        canManage = false,
        permCreateTasks = true,
        permEditTasks = true,
        permDeleteTasks = true,
        permAssignTasks = true,
      } = req.body;
      const normalizedEmail = email.toLowerCase();

      // Reject if email already has an account
      const existingUser = await UserModel.findByEmail(normalizedEmail);
      if (existingUser) {
        res.status(409).json({ error: 'A user with this email already has an account' });
        return;
      }

      const groupOwnerId = req.effectiveUserId;

      // Reject if a pending invite already exists for this email in the group
      const existingInvite = await InvitationModel.findPendingByEmail(normalizedEmail, groupOwnerId);
      if (existingInvite) {
        res.status(409).json({ error: 'A pending invitation already exists for this email' });
        return;
      }

      // Get inviter name for the email
      const inviter = await UserModel.findById(req.userId);
      const inviterName = inviter
        ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.email
        : 'Someone';

      // Generate token and send email
      const token = await TokenService.generateInvitationToken(req.userId, groupOwnerId, normalizedEmail, {
        canManage,
        permCreateTasks,
        permEditTasks,
        permDeleteTasks,
        permAssignTasks,
      });
      await EmailService.sendInvitationEmail(normalizedEmail, token, inviterName);

      res.json({ message: 'Invitation sent successfully' });
    } catch (error) {
      console.error('Send invite error:', error);
      res.status(500).json({ error: 'Failed to send invitation' });
    }
  },

  async checkInvite(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      const inviteData = await TokenService.verifyInvitationToken(token);
      if (!inviteData) {
        res.status(400).json({ error: 'Invalid or expired invitation token' });
        return;
      }

      const inviter = await UserModel.findById(inviteData.inviterId);
      const inviterName = inviter
        ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.email
        : 'Someone';

      res.json({ email: inviteData.email, inviterName });
    } catch (error) {
      console.error('Check invite error:', error);
      res.status(500).json({ error: 'Failed to verify invitation' });
    }
  },

  async getGroupInfo(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId || !req.effectiveUserId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const groupOwnerId = req.effectiveUserId;

      // Get the owner
      const owner = await UserModel.findById(groupOwnerId);
      if (!owner) {
        res.status(404).json({ error: 'Group owner not found' });
        return;
      }

      // Get all members (users with group_owner_id = groupOwnerId)
      const members = await UserModel.findGroupMembers(groupOwnerId);

      // Get pending invitations
      const pendingInvites = await InvitationModel.findPendingByGroupOwner(groupOwnerId);

      res.json({
        owner: UserModel.toPublic(owner),
        members: members.map(UserModel.toPublic),
        pendingInvites: pendingInvites.map((inv) => ({
          id: inv.id,
          email: inv.email,
          canManage: inv.can_manage,
          permCreateTasks: inv.perm_create_tasks,
          permEditTasks: inv.perm_edit_tasks,
          permDeleteTasks: inv.perm_delete_tasks,
          permAssignTasks: inv.perm_assign_tasks,
          expiresAt: inv.expires_at,
          createdAt: inv.created_at,
        })),
        canManage: req.canManageGroup,
      });
    } catch (error) {
      console.error('Get group info error:', error);
      res.status(500).json({ error: 'Failed to get group info' });
    }
  },

  async removeGroupMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId || !req.effectiveUserId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const targetUserId = parseInt(req.params.userId, 10);
      if (isNaN(targetUserId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const groupOwnerId = req.effectiveUserId;

      // Cannot remove the group owner
      if (targetUserId === groupOwnerId) {
        res.status(400).json({ error: 'Cannot remove the group owner' });
        return;
      }

      // Cannot remove yourself
      if (targetUserId === req.userId) {
        res.status(400).json({ error: 'Cannot remove yourself from the group' });
        return;
      }

      // Verify the target user is actually in this group
      const targetUser = await UserModel.findById(targetUserId);
      if (!targetUser || targetUser.group_owner_id !== groupOwnerId) {
        res.status(404).json({ error: 'User is not a member of this group' });
        return;
      }

      await UserModel.setGroupOwner(targetUserId, null, false);

      res.json({ message: 'Member removed from group successfully' });
    } catch (error) {
      console.error('Remove group member error:', error);
      res.status(500).json({ error: 'Failed to remove group member' });
    }
  },
};
