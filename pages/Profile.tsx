import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

const Profile: React.FC = () => {
  const { firebaseUser, activeCompany } = useAuth();
  const companyName = (activeCompany as { companyName?: string } | null)?.companyName || '';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={firebaseUser?.displayName} email={firebaseUser?.email} size={64} />
        <div>
          <h2 className="text-2xl font-semibold">{firebaseUser?.displayName || 'المستخدم'}</h2>
          <div className="text-sm text-gray-500">{firebaseUser?.email}</div>
        </div>
      </div>
      <section className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm space-y-3">
        <div>
          <h3 className="font-medium mb-1">الشركة</h3>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {companyName || 'غير محدد'}
          </div>
        </div>
        <div>
          <h3 className="font-medium mb-1">الملف الشخصي</h3>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            يعرض هذا القسم معلومات الحساب الأساسية. استخدم الإعدادات لتحديث بيانات الشركة.
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
