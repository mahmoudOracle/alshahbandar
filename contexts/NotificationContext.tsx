
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import Notification, { NotificationProps } from '../components/Notification';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationAction {
  label: string;
  onClick: () => void | Promise<void>;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType, action?: NotificationAction) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let notificationId = 0;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Omit<NotificationProps, 'onDismiss'>[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType, action?: NotificationAction) => {
    const id = notificationId++;
    setNotifications(prev => [...prev, { id, message, type, action }]);
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
    // Provide a safe no-op implementation to simplify usage and testing
    return { addNotification: (_message: string, _type: NotificationType) => {} } as NotificationContextType;
  }
  return context;
};
