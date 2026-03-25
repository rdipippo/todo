import api, { tokenStorage } from './api';

export interface User {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  role: string;
  enabled: boolean;
  group_owner_id: number | null;
  group_can_manage: boolean;
  perm_create_tasks: boolean;
  perm_edit_tasks: boolean;
  perm_delete_tasks: boolean;
  perm_assign_tasks: boolean;
  created_at: string;
}

export interface TaskPermissions {
  permCreateTasks: boolean;
  permEditTasks: boolean;
  permDeleteTasks: boolean;
  permAssignTasks: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  inviteToken?: string;
}

export interface GroupMember {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  group_can_manage: boolean;
  created_at: string;
}

export interface PendingInvite {
  id: number;
  email: string;
  canManage: boolean;
  permCreateTasks: boolean;
  permEditTasks: boolean;
  permDeleteTasks: boolean;
  permAssignTasks: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface GroupInfo {
  owner: User;
  members: User[];
  pendingInvites: PendingInvite[];
  canManage: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Array<{ field: string; message: string }>;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { accessToken, refreshToken } = response.data;

    tokenStorage.setAccessToken(accessToken);
    tokenStorage.setRefreshToken(refreshToken);

    return response.data;
  },

  async register(data: RegisterData): Promise<{ message: string; userId: number }> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      await api.post('/auth/logout', { refreshToken });
    } finally {
      tokenStorage.clearTokens();
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data.user;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await api.get(`/auth/verify-email/${token}`);
    return response.data;
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  async sendInvite(
    email: string,
    canManage: boolean,
    taskPermissions: TaskPermissions
  ): Promise<{ message: string }> {
    const response = await api.post('/auth/invite', { email, canManage, ...taskPermissions });
    return response.data;
  },

  async checkInvite(token: string): Promise<{ email: string; inviterName: string }> {
    const response = await api.get(`/auth/invite/${token}`);
    return response.data;
  },

  async getGroupInfo(): Promise<GroupInfo> {
    const response = await api.get<GroupInfo>('/auth/group');
    return response.data;
  },

  async removeGroupMember(userId: number): Promise<{ message: string }> {
    const response = await api.delete(`/auth/group/members/${userId}`);
    return response.data;
  },

  isAuthenticated(): boolean {
    return !!tokenStorage.getAccessToken();
  },
};

export default authService;
