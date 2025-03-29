import React, { useState, useEffect } from 'react';
import { JobStatus } from '../types/Job';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  timestamp: Date;
}

interface NotificationsProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-container position-fixed" style={{ top: '20px', right: '20px', zIndex: 1050, width: '350px' }}>
      {notifications.map((notification) => (
        <div 
          key={notification.id} 
          className={`alert alert-${notification.type} alert-dismissible fade show mb-3 shadow-sm`}
          role="alert"
        >
          <strong>{notification.message}</strong>
          <small className="d-block text-muted">
            {notification.timestamp.toLocaleTimeString()}
          </small>
          <button
            type="button"
            className="btn-close"
            onClick={() => onDismiss(notification.id)}
            aria-label="Close"
          />
        </div>
      ))}
    </div>
  );
};

export const createJobNotification = (jobId: string, jobName: string, status: JobStatus): Notification => {
  let message = '';
  let type: 'success' | 'danger' | 'warning' | 'info' = 'info';

  switch (status) {
    case JobStatus.Completed:
      message = `Job "${jobName}" has completed successfully.`;
      type = 'success';
      break;
    case JobStatus.Failed:
      message = `Job "${jobName}" has failed.`;
      type = 'danger';
      break;
    case JobStatus.Running:
      message = `Job "${jobName}" has started running.`;
      type = 'info';
      break;
    case JobStatus.Stopped:
      message = `Job "${jobName}" has been stopped.`;
      type = 'warning';
      break;
    default:
      message = `Job "${jobName}" status updated to ${status}.`;
  }

  return {
    id: `${jobId}-${Date.now()}`,
    message,
    type,
    timestamp: new Date()
  };
};

export default Notifications; 