import React, { useEffect, useState } from 'react';
import { EnvelopeIcon, PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CompanyInvitation, CompanyUser, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  deleteInvitation,
  getCompanyUsers,
  getPendingInvitations,
  inviteUser,
  removeUserFromCompany,
  updateUserRole,
} from '../services/dataService';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { t } from '../src/i18n/t';

const roleMap: Record<UserRole, string> = {
  [UserRole.Owner]: t('roleOwner'),
  [UserRole.Manager]: t('roleManager'),
  [UserRole.Employee]: t('roleStaff'),
  [UserRole.Viewer]: t('roleViewer'),
};

const UserManagement: React.FC = () => {
  const { companyId, user } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<CompanyInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.Employee);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const usersData = await getCompanyUsers(companyId);
      setUsers(usersData || []);

      try {
        setInvitationsError(null);
        const invitationsData = await getPendingInvitations(companyId);
        setPendingInvitations(invitationsData || []);
      } catch (invErr) {
        console.warn(
          '[UserManagement] Failed to load invitations, continuing with users only',
          invErr
        );
        const msg = invErr instanceof Error ? invErr.message : String(invErr);
        setInvitationsError(msg);
        setPendingInvitations([]);
        addNotification(t('userMgmtLoadInvitesFailed'), 'warning');
      }
    } catch (error) {
      addNotification(t('userMgmtLoadUsersFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const retryLoadInvitations = async () => {
    if (!companyId) return;
    setInvitationsLoading(true);
    setInvitationsError(null);
    try {
      const invitationsData = await getPendingInvitations(companyId);
      setPendingInvitations(invitationsData || []);
    } catch (err: unknown) {
      console.warn('[UserManagement] retryLoadInvitations failed', err);
      const msg = err instanceof Error ? err.message : String(err || '');
      setInvitationsError(msg);
      addNotification(t('userMgmtLoadInvitesFailed'), 'warning');
    } finally {
      setInvitationsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newUserEmail || !user?.email || !user.uid) return;

    try {
      const invitedBy = { uid: user.uid, email: user.email };
      await inviteUser(companyId, newUserEmail, newUserRole, invitedBy);
      addNotification(t('userMgmtInviteCreated', { email: newUserEmail }), 'success');

      setNewUserEmail('');
      setNewUserRole(UserRole.Employee);
      fetchData();
    } catch (error) {
      addNotification(t('userMgmtInviteFailed'), 'error');
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!companyId) return;
    try {
      const res = (await updateUserRole(companyId, userId, newRole)) as unknown as {
        enqueued?: boolean;
      };
      if (res && res.enqueued) {
        addNotification(t('userMgmtRoleUpdateQueued'), 'info');
      } else {
        addNotification(t('userMgmtRoleUpdateSuccess'), 'success');
      }
      fetchData();
    } catch (e) {
      addNotification(t('userMgmtRoleUpdateFailed'), 'error');
    }
  };

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (!companyId || !window.confirm(t('userMgmtRemoveConfirm', { email: userEmail }))) return;
    try {
      await removeUserFromCompany(companyId, userId);
      addNotification(t('userMgmtRemoveSuccess'), 'success');
      fetchData();
    } catch (e) {
      addNotification(t('userMgmtRemoveFailed'), 'error');
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!companyId || !window.confirm(t('userMgmtCancelInviteConfirm', { email }))) return;
    try {
      await deleteInvitation(companyId, invitationId);
      addNotification(t('userMgmtCancelInviteSuccess'), 'success');
      fetchData();
    } catch (error) {
      addNotification(t('userMgmtCancelInviteFailed'), 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
      <h3 className="text-xl font-bold mb-6 border-b dark:border-gray-700 pb-4">
        {t('userMgmtTitle')}
      </h3>

      <form onSubmit={handleInvite} className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h4 className="text-lg font-semibold mb-3">{t('userMgmtInviteTitle')}</h4>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            type="email"
            placeholder={t('userMgmtInviteEmailPlaceholder')}
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            required
            className="flex-grow"
          />
          <Select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as UserRole)}
            options={[
              { value: UserRole.Manager, label: roleMap[UserRole.Manager] },
              { value: UserRole.Employee, label: roleMap[UserRole.Employee] },
              { value: UserRole.Viewer, label: roleMap[UserRole.Viewer] },
            ]}
          />
          <Button type="submit">
            <PaperAirplaneIcon className="h-5 w-5 me-2" />
            {t('userMgmtInviteButton')}
          </Button>
        </div>
      </form>

      <div className="space-y-8">
        <div>
          <h4 className="text-lg font-semibold mb-3">{t('userMgmtCurrentUsers')}</h4>
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.uid}
                className="flex flex-col sm:flex-row items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md"
              >
                <span className="font-medium">
                  {u.email} {u.uid === user?.uid && t('userMgmtYou')}
                </span>
                <div className="flex items-center gap-4 mt-2 sm:mt-0">
                  {u.role === UserRole.Owner ? (
                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-200 text-yellow-800">
                      {roleMap[u.role]}
                    </span>
                  ) : (
                    <>
                      <Select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                        options={[
                          { value: UserRole.Manager, label: roleMap[UserRole.Manager] },
                          { value: UserRole.Employee, label: roleMap[UserRole.Employee] },
                          { value: UserRole.Viewer, label: roleMap[UserRole.Viewer] },
                        ]}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(u.uid, u.email)}
                        aria-label={t('commonRemove')}
                      >
                        <TrashIcon className="h-5 w-5 text-danger-600" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-3">{t('userMgmtPendingInvites')}</h4>
          {loading || invitationsLoading ? (
            <p>{t('commonLoading')}</p>
          ) : invitationsError ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-600 mb-2">{t('userMgmtInvitesLoadError')}</p>
              <div className="flex justify-center">
                <Button onClick={retryLoadInvitations}>{t('userMgmtRetry')}</Button>
              </div>
            </div>
          ) : pendingInvitations.length > 0 ? (
            <div className="space-y-3">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md"
                >
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 me-3 text-gray-500" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {inv.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 sm:mt-0">
                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-200 text-blue-800">
                      {roleMap[inv.role]}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(inv.id, inv.email)}
                      title={t('userMgmtCancelInvite')}
                    >
                      <TrashIcon className="h-5 w-5 text-danger-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">{t('userMgmtNoPending')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
