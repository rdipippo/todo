import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Checkbox, Alert } from '../components';
import { authService, GroupInfo, TaskPermissions } from '../services';
import { AxiosError } from 'axios';
import { ApiError } from '../services';
import '../styles/invite.css';

export const InviteScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [taskPermissions, setTaskPermissions] = useState<TaskPermissions>({
    permCreateTasks: true,
    permEditTasks: true,
    permDeleteTasks: true,
    permAssignTasks: true,
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [removeError, setRemoveError] = useState('');

  const canManageGroup = !user?.group_owner_id || user?.group_can_manage;

  const loadGroupInfo = useCallback(async () => {
    try {
      const info = await authService.getGroupInfo();
      setGroupInfo(info);
    } catch {
      setLoadError(t('invite.loadError'));
    }
  }, [t]);

  useEffect(() => {
    loadGroupInfo();
  }, [loadGroupInfo]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSuccess('');
    setInviteError('');

    if (!inviteEmail) return;

    setInviteLoading(true);
    try {
      await authService.sendInvite(inviteEmail, canManage, taskPermissions);
      setInviteSuccess(t('invite.sendSuccess'));
      setInviteEmail('');
      setCanManage(false);
      setTaskPermissions({ permCreateTasks: true, permEditTasks: true, permDeleteTasks: true, permAssignTasks: true });
      await loadGroupInfo();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      if (axiosError.response?.status === 409) {
        setInviteError(
          axiosError.response.data.error === 'A pending invitation already exists for this email'
            ? t('invite.alreadyInvited')
            : t('invite.alreadyMember')
        );
      } else {
        setInviteError(t('invite.sendError'));
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    setRemoveError('');
    try {
      await authService.removeGroupMember(memberId);
      await loadGroupInfo();
    } catch {
      setRemoveError(t('invite.removeError'));
    }
  };

  const displayName = (u: { first_name: string | null; last_name: string | null; email: string }) => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return name || u.email;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="screen">
      <div className="invite-container">
        <div className="invite-header">
          <button className="back-link" onClick={() => navigate('/')}>
            ← {t('categories.backToHome')}
          </button>
          <h1>{t('invite.title')}</h1>
          <p>{t('invite.subtitle')}</p>
        </div>

        {loadError && <Alert type="error">{loadError}</Alert>}

        {canManageGroup && (
          <div className="invite-section">
            <h2>{t('invite.title')}</h2>
            {inviteSuccess && <Alert type="success">{inviteSuccess}</Alert>}
            {inviteError && <Alert type="error">{inviteError}</Alert>}
            <form onSubmit={handleSendInvite} className="invite-form">
              <Input
                label={t('register.email')}
                type="email"
                name="inviteEmail"
                placeholder={t('invite.emailPlaceholder')}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoCapitalize="none"
              />
              <Checkbox
                label={t('invite.canManageLabel')}
                checked={canManage}
                onChange={(e) => setCanManage(e.target.checked)}
              />
              <div className="invite-permissions">
                <p className="invite-permissions-title">{t('invite.permissionsTitle')}</p>
                <Checkbox
                  label={t('invite.permCreateTasks')}
                  checked={taskPermissions.permCreateTasks}
                  onChange={(e) => setTaskPermissions((p) => ({ ...p, permCreateTasks: e.target.checked }))}
                />
                <Checkbox
                  label={t('invite.permEditTasks')}
                  checked={taskPermissions.permEditTasks}
                  onChange={(e) => setTaskPermissions((p) => ({ ...p, permEditTasks: e.target.checked }))}
                />
                <Checkbox
                  label={t('invite.permDeleteTasks')}
                  checked={taskPermissions.permDeleteTasks}
                  onChange={(e) => setTaskPermissions((p) => ({ ...p, permDeleteTasks: e.target.checked }))}
                />
                <Checkbox
                  label={t('invite.permAssignTasks')}
                  checked={taskPermissions.permAssignTasks}
                  onChange={(e) => setTaskPermissions((p) => ({ ...p, permAssignTasks: e.target.checked }))}
                />
              </div>
              <Button type="submit" loading={inviteLoading} disabled={!inviteEmail}>
                {t('invite.sendButton')}
              </Button>
            </form>
          </div>
        )}

        {groupInfo && (
          <>
            <div className="invite-section">
              <h2>{t('invite.membersTitle')}</h2>
              {removeError && <Alert type="error">{removeError}</Alert>}
              <div className="member-list">
                <div className="member-item member-item-owner">
                  <div className="member-info">
                    <span className="member-name">{displayName(groupInfo.owner)}</span>
                    <span className="member-email">{groupInfo.owner.email}</span>
                  </div>
                  <span className="member-badge">{t('invite.membersSelf')}</span>
                </div>
                {groupInfo.members.map((member) => (
                  <div key={member.id} className="member-item">
                    <div className="member-info">
                      <span className="member-name">{displayName(member)}</span>
                      <span className="member-email">{member.email}</span>
                      {member.group_can_manage && (
                        <span className="member-badge member-badge-manage">{t('invite.canManageLabel')}</span>
                      )}
                      <div className="member-perms">
                        {member.perm_create_tasks && <span className="perm-badge">{t('invite.permCreateTasks')}</span>}
                        {member.perm_edit_tasks && <span className="perm-badge">{t('invite.permEditTasks')}</span>}
                        {member.perm_delete_tasks && <span className="perm-badge">{t('invite.permDeleteTasks')}</span>}
                        {member.perm_assign_tasks && <span className="perm-badge">{t('invite.permAssignTasks')}</span>}
                      </div>
                    </div>
                    {canManageGroup && (
                      <Button
                        variant="secondary"
                        className="btn-remove"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        {t('invite.removeButton')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {groupInfo.pendingInvites.length > 0 && (
              <div className="invite-section">
                <h2>{t('invite.pendingTitle')}</h2>
                <div className="member-list">
                  {groupInfo.pendingInvites.map((invite) => (
                    <div key={invite.id} className="member-item member-item-pending">
                      <div className="member-info">
                        <span className="member-name">{invite.email}</span>
                        <span className="member-email">
                          {t('invite.expiresOn')} {formatDate(invite.expiresAt)}
                        </span>
                        {invite.canManage && (
                          <span className="member-badge member-badge-manage">{t('invite.canManageLabel')}</span>
                        )}
                      </div>
                      <span className="member-badge member-badge-pending">{t('invite.pendingBadge')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InviteScreen;
