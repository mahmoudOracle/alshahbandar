import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

const Profile: React.FC = () => {
  const { firebaseUser } = useAuth();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={firebaseUser?.displayName} email={firebaseUser?.email} size={64} />
        <div>
          <h2 className="text-2xl font-semibold">{firebaseUser?.displayName || 'User'}</h2>
          <div className="text-sm text-gray-500">{firebaseUser?.email}</div>
        </div>
      </div>
      <section className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm">
        <h3 className="font-medium mb-2">Profile</h3>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          This page shows basic profile information. Use company settings for account-level
          configuration.
        </div>
      </section>
    </div>
  );
};

export default Profile;
