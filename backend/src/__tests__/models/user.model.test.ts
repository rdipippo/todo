const mockExecute = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { execute: mockExecute },
}));

import { UserModel, User } from '../../models/user.model';

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  password_hash: 'hashed',
  first_name: 'John',
  last_name: 'Doe',
  email_verified: true,
  role: 'user',
  enabled: true,
  group_owner_id: null,
  group_can_manage: false,
  perm_create_tasks: true,
  perm_edit_tasks: true,
  perm_delete_tasks: true,
  perm_assign_tasks: true,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-02'),
};

describe('UserModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockExecute.mockResolvedValue([[mockUser]]);
      const result = await UserModel.findById(1);
      expect(result).toEqual(mockUser);
      expect(mockExecute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        [1]
      );
    });

    it('should return null when not found', async () => {
      mockExecute.mockResolvedValue([[]]);
      const result = await UserModel.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found (lowercased)', async () => {
      mockExecute.mockResolvedValue([[mockUser]]);
      const result = await UserModel.findByEmail('Test@Example.com');
      expect(result).toEqual(mockUser);
      expect(mockExecute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ?',
        ['test@example.com']
      );
    });

    it('should return null when not found', async () => {
      mockExecute.mockResolvedValue([[]]);
      const result = await UserModel.findByEmail('missing@example.com');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert user and return insertId', async () => {
      mockExecute.mockResolvedValue([{ insertId: 42 }]);
      const result = await UserModel.create({
        email: 'New@Example.com',
        password_hash: 'hash',
        first_name: 'Jane',
        last_name: 'Smith',
      });
      expect(result).toBe(42);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['new@example.com', 'hash', 'Jane', 'Smith', 'user']
      );
    });

    it('should handle optional fields with defaults', async () => {
      mockExecute.mockResolvedValue([{ insertId: 43 }]);
      const result = await UserModel.create({
        email: 'a@b.com',
        password_hash: 'hash',
      });
      expect(result).toBe(43);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(String),
        ['a@b.com', 'hash', null, null, 'user']
      );
    });

    it('should use custom role when provided', async () => {
      mockExecute.mockResolvedValue([{ insertId: 44 }]);
      await UserModel.create({
        email: 'admin@b.com',
        password_hash: 'hash',
        role: 'admin',
      });
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(String),
        ['admin@b.com', 'hash', null, null, 'admin']
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password and return true on success', async () => {
      mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
      const result = await UserModel.updatePassword(1, 'new_hash');
      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        ['new_hash', 1]
      );
    });

    it('should return false when user not found', async () => {
      mockExecute.mockResolvedValue([{ affectedRows: 0 }]);
      const result = await UserModel.updatePassword(999, 'hash');
      expect(result).toBe(false);
    });
  });

  describe('verifyEmail', () => {
    it('should set email_verified to true', async () => {
      mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
      const result = await UserModel.verifyEmail(1);
      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        'UPDATE users SET email_verified = TRUE WHERE id = ?',
        [1]
      );
    });
  });

  describe('exists', () => {
    it('should return true if email exists', async () => {
      mockExecute.mockResolvedValue([[{ 1: 1 }]]);
      const result = await UserModel.exists('Test@Example.com');
      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        'SELECT 1 FROM users WHERE email = ?',
        ['test@example.com']
      );
    });

    it('should return false if email does not exist', async () => {
      mockExecute.mockResolvedValue([[]]);
      const result = await UserModel.exists('missing@example.com');
      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      mockExecute.mockResolvedValue([[mockUser]]);
      const result = await UserModel.findAll();
      expect(result).toEqual([mockUser]);
      expect(mockExecute).toHaveBeenCalledWith(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
    });
  });

  describe('updateEnabled', () => {
    it('should update enabled status', async () => {
      mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
      const result = await UserModel.updateEnabled(1, false);
      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        'UPDATE users SET enabled = ? WHERE id = ?',
        [false, 1]
      );
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
      const result = await UserModel.updateRole(1, 'admin');
      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        'UPDATE users SET role = ? WHERE id = ?',
        ['admin', 1]
      );
    });
  });

  describe('toPublic', () => {
    it('should strip password_hash and updated_at', () => {
      const publicUser = UserModel.toPublic(mockUser);
      expect(publicUser).toEqual({
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        email_verified: true,
        role: 'user',
        enabled: true,
        created_at: new Date('2024-01-01'),
      });
      expect((publicUser as any).password_hash).toBeUndefined();
      expect((publicUser as any).updated_at).toBeUndefined();
    });
  });
});
