import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { JobProvider } from './contexts/JobContext';
import { SignalRProvider } from './contexts/SignalRContext';
import { NotificationProvider } from './contexts/NotificationContext';
import JobDashboard from './components/JobDashboard';

/**
 * The main App component serves as a container with contexts
 * to provide state management to the children.
 * 
 * This structure isolates state changes to specific components
 * and prevents the entire app tree from re-rendering.
 */
const App: React.FC = () => {
  console.log('%c📱 App component rendering (root)', 'background: #E91E63; color: white; padding: 2px 4px; border-radius: 2px;');

  return (
    <JobProvider>
      <NotificationProvider>
        <SignalRProvider>
          <JobDashboard />
        </SignalRProvider>
      </NotificationProvider>
    </JobProvider>
  );
};

export default App; 