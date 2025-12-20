
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import Notification, { NotificationProps } from '../components/Notification';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let notificationId = 0;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Omit<NotificationProps, 'onDismiss'>[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const id = notificationId++;
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed top-5 right-5 z-50 space-y-2 w-full max-w-sm">
        {notifications.map(notification => (
          <Notification key={notification.id} {...notification} onDismiss={dismissNotification} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
