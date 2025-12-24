import React, { useState, useEffect } from 'react';
import { CompanyUser, UserRole, CompanyInvitation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getCompanyUsers, inviteUser, updateUserRole, removeUserFromCompany, getPendingInvitations, deleteInvitation } from '../services/dataService';
import { useNotification } from '../contexts/NotificationContext';
import { TrashIcon, PaperAirplaneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';


const roleMap: Record<UserRole, string> = {
    [UserRole.Owner]: 'مالك',
    [UserRole.Manager]: 'مدير',
    [UserRole.Employee]: 'موظف',
    [UserRole.Viewer]: 'مشاهد',
};

const UserManagement: React.FC = () => {
    const { activeCompanyId, firebaseUser } = useAuth();
    const { settings } = useSettings();
    const [users, setUsers] = useState<CompanyUser[]>([]);
    const [pendingInvitations, setPendingInvitations] = useState<CompanyInvitation[]>([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.Employee);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();

    const fetchData = async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const [usersData, invitationsData] = await Promise.all([
                getCompanyUsers(activeCompanyId),
                getPendingInvitations(activeCompanyId)
            ]);
            setUsers(usersData || []);
            setPendingInvitations(invitationsData || []);
        } catch (error) {
            addNotification('فشل تحميل بيانات المستخدمين.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeCompanyId]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCompanyId || !newUserEmail || !firebaseUser?.email || !firebaseUser.uid) return;
        
        try {
            const invitedBy = { uid: firebaseUser.uid, email: firebaseUser.email };
            await inviteUser(activeCompanyId, newUserEmail, newUserRole, invitedBy);
            addNotification(`تم إنشاء دعوة لـ ${newUserEmail}.`, 'success');
            
            setNewUserEmail('');
            setNewUserRole(UserRole.Employee);
            fetchData();
        } catch (error) {
            addNotification('فشل إرسال الدعوة. يرجى المحاولة مرة أخرى.', 'error');
        }
    };
    
    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        if (!activeCompanyId) return;
        try {
            await updateUserRole(activeCompanyId, userId, newRole);
            addNotification('تم تحديث دور المستخدم بنجاح.', 'success');
            fetchData();
        } catch(e) {
             addNotification('فشل تحديث الدور.', 'error');
        }
    };

    const handleRemoveUser = async (userId: string, userEmail: string) => {
        if (!activeCompanyId || !window.confirm(`هل أنت متأكد من إزالة المستخدم ${userEmail}؟ سيتم إلغاء وصوله فوراً.`)) return;
        try {
            await removeUserFromCompany(activeCompanyId, userId);
            addNotification('تمت إزالة المستخدم بنجاح.', 'success');
            fetchData();
        } catch(e) {
            addNotification('فشلت إزالة المستخدم.', 'error');
        }
    };

    const handleCancelInvitation = async (invitationId: string, email: string) => {
        if (!activeCompanyId || !window.confirm(`هل أنت متأكد من إلغاء الدعوة المرسلة إلى ${email}؟`)) return;
        try {
            await deleteInvitation(activeCompanyId, invitationId);
            addNotification('تم إلغاء الدعوة بنجاح.', 'success');
            fetchData();
        } catch (error) {
            addNotification('فشل إلغاء الدعوة.', 'error');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
            <h3 className="text-xl font-bold mb-6 border-b dark:border-gray-700 pb-4">إدارة المستخدمين</h3>
            
            <form onSubmit={handleInvite} className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                 <h4 className="text-lg font-semibold mb-3">دعوة مستخدم جديد</h4>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <Input 
                        type="email"
                        placeholder="بريد إلكتروني"
                        value={newUserEmail}
                        onChange={e => setNewUserEmail(e.target.value)}
                        required
                        className="flex-grow"
                    />
                    <Select
                        value={newUserRole}
                        onChange={e => setNewUserRole(e.target.value as UserRole)}
                        options={[
                           { value: UserRole.Manager, label: roleMap[UserRole.Manager] },
                           { value: UserRole.Employee, label: roleMap[UserRole.Employee] },
                           { value: UserRole.Viewer, label: roleMap[UserRole.Viewer] },
                        ]}
                    />
                    <Button type="submit">
                        <PaperAirplaneIcon className="h-5 w-5 me-2"/>
                        إنشاء دعوة
                    </Button>
                 </div>
            </form>

            <div className="space-y-8">
                <div>
                     <h4 className="text-lg font-semibold mb-3">المستخدمون الحاليون</h4>
                     <div className="space-y-3">
                        {users.map(u => (
                            <div key={u.uid} className="flex flex-col sm:flex-row items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                <span className="font-medium">{u.email} {u.uid === firebaseUser?.uid && '(أنت)'}</span>
                                <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                    {u.role === UserRole.Owner ? (
                                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-200 text-yellow-800">{roleMap[u.role]}</span>
                                    ) : (
                                        <>
                                            <Select value={u.role} onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                                                options={[
                                                    { value: UserRole.Manager, label: roleMap[UserRole.Manager] },
                                                    { value: UserRole.Employee, label: roleMap[UserRole.Employee] },
                                                    { value: UserRole.Viewer, label: roleMap[UserRole.Viewer] },
                                                ]}
                                            />
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveUser(u.uid, u.email)} aria-label="Remove user"><TrashIcon className="h-5 w-5 text-danger-600"/></Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                     </div>
                </div>

                <div>
                     <h4 className="text-lg font-semibold mb-3">الدعوات المعلقة</h4>
                     {loading ? <p>جاري التحميل...</p> : pendingInvitations.length > 0 ? (
                         <div className="space-y-3">
                            {pendingInvitations.map(inv => (
                                <div key={inv.id} className="flex flex-col sm:flex-row items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                    <div className="flex items-center">
                                        <EnvelopeIcon className="h-5 w-5 me-3 text-gray-500"/>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{inv.email}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-200 text-blue-800">{roleMap[inv.role]}</span>
                                        <Button variant="ghost" size="sm" onClick={() => handleCancelInvitation(inv.id, inv.email)} title="إلغاء الدعوة">
                                            <TrashIcon className="h-5 w-5 text-danger-600"/>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                         </div>
                     ) : (
                         <p className="text-center text-gray-500 py-4">لا توجد دعوات معلقة حالياً.</p>
                     )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;