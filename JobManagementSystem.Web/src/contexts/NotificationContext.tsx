import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Notification } from '../components/Notifications';

// Type definitions for context
interface NotificationContextState {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  dismissNotification: (id: string) => void;
}

// Create the context
const NotificationContext = createContext<NotificationContextState | undefined>(undefined);

// Provider component
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 5)); // Keep only 5 most recent
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Context value
  const value: NotificationContextState = {
    notifications,
    addNotification,
    dismissNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = (): NotificationContextState => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 