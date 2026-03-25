import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Invitation {
  id: number;
  inviter_id: number;
  group_owner_id: number;
  email: string;
  token_hash: string;
  expires_at: Date;
  used: boolean;
  can_manage: boolean;
  perm_create_tasks: boolean;
  perm_edit_tasks: boolean;
  perm_delete_tasks: boolean;
  perm_assign_tasks: boolean;
  created_at: Date;
}

export interface InvitationPermissions {
  canManage: boolean;
  permCreateTasks: boolean;
  permEditTasks: boolean;
  permDeleteTasks: boolean;
  permAssignTasks: boolean;
}

export const InvitationModel = {
  async create(
    inviterId: number,
    groupOwnerId: number,
    email: string,
    tokenHash: string,
    expiresAt: Date,
    permissions: InvitationPermissions
  ): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO invitations
         (inviter_id, group_owner_id, email, token_hash, expires_at,
          can_manage, perm_create_tasks, perm_edit_tasks, perm_delete_tasks, perm_assign_tasks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inviterId,
        groupOwnerId,
        email.toLowerCase(),
        tokenHash,
        expiresAt,
        permissions.canManage,
        permissions.permCreateTasks,
        permissions.permEditTasks,
        permissions.permDeleteTasks,
        permissions.permAssignTasks,
      ]
    );
    return result.insertId;
  },

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM invitations WHERE token_hash = ?',
      [tokenHash]
    );
    return rows.length > 0 ? (rows[0] as Invitation) : null;
  },

  async markAsUsed(id: number): Promise<void> {
    await pool.execute('UPDATE invitations SET used = TRUE WHERE id = ?', [id]);
  },

  async findPendingByEmail(email: string, groupOwnerId: number): Promise<Invitation | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM invitations
       WHERE email = ? AND group_owner_id = ? AND used = FALSE AND expires_at > NOW()`,
      [email.toLowerCase(), groupOwnerId]
    );
    return rows.length > 0 ? (rows[0] as Invitation) : null;
  },

  async findPendingByGroupOwner(groupOwnerId: number): Promise<Invitation[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM invitations
       WHERE group_owner_id = ? AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [groupOwnerId]
    );
    return rows as Invitation[];
  },
};
