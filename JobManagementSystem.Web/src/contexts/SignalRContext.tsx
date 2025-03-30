import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { startConnection, stopConnection, getConnectionState, JobProgressUpdate } from '../services/signalRService';
import { useJobs } from './JobContext';

// Global flag for persistent connection
export const globalSignalRStarted = { value: false };

// Type definitions for context
interface SignalRContextState {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  messageCount: number;
  reconnect: () => void;
}

// Create the context
const SignalRContext = createContext<SignalRContextState | undefined>(undefined);

// Provider component
export const SignalRProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [messageCount, setMessageCount] = useState<number>(0);
  
  // Get access to job context for updating jobs
  const { updateJobProgress, addJob } = useJobs();
  
  // Function to update connection status display
  const updateConnectionStatus = useCallback(() => {
    const state = getConnectionState();
    console.log(`SignalR connection state changed to: ${state}`);
    
    switch (state) {
      case HubConnectionState.Connected:
        setConnectionStatus('connected');
        break;
      case HubConnectionState.Connecting:
      case HubConnectionState.Reconnecting:
        setConnectionStatus('connecting');
        break;
      default:
        setConnectionStatus('disconnected');
    }
  }, []); // Empty dependency array since getConnectionState is stable
  
  // Stabilize the job update handler with useCallback and a ref
  const updateJobProgressRef = React.useRef(updateJobProgress);
  React.useEffect(() => {
    updateJobProgressRef.current = updateJobProgress;
  }, [updateJobProgress]);
  
  // Handle real-time job updates with stable reference
  const handleJobUpdate = useCallback((update: JobProgressUpdate) => {
    console.log('SignalR update received:', update);
    setMessageCount(prev => prev + 1);
    
    // Update job through context using the ref
    const notification = updateJobProgressRef.current(update);
    
    // Return the notification for parent component to show
    return notification;
  }, []); // Empty dependency array since we use ref
  
  // Reconnect function with stable dependencies
  const reconnect = useCallback(() => {
    console.log('Manual reconnection requested');
    globalSignalRStarted.value = false;
    stopConnection().then(() => {
      setConnectionStatus('disconnected');
      setTimeout(() => {
        startConnection(handleJobUpdate)
          .then(() => updateConnectionStatus())
          .catch(err => console.error('Error reconnecting:', err));
      }, 500);
    });
  }, [handleJobUpdate, updateConnectionStatus]);
  
  // Initialize SignalR connection
  useEffect(() => {
    console.log('SignalR provider mounted');
    
    if (!globalSignalRStarted.value) {
      globalSignalRStarted.value = true;
      console.log('Initializing SignalR connection...');
      
      let isCleaningUp = false;
      let connectionCheckInterval: NodeJS.Timeout | null = null;
      
      // Start connection
      setConnectionStatus('connecting');
      startConnection(handleJobUpdate)
        .then(() => {
          if (isCleaningUp) return;
          
          console.log('SignalR connection established');
          updateConnectionStatus();
          
          // Check connection status periodically
          connectionCheckInterval = setInterval(() => {
            const state = getConnectionState();
            updateConnectionStatus();
            
            // Auto-reconnect if disconnected
            if (state === HubConnectionState.Disconnected) {
              console.log('Connection lost - auto-reconnecting');
              startConnection(handleJobUpdate)
                .then(() => updateConnectionStatus())
                .catch(err => console.warn('Auto-reconnect attempt failed:', err));
            }
          }, 5000);
        })
        .catch((error) => {
          if (isCleaningUp) return;
          
          console.error('SignalR connection error:', error);
          setConnectionStatus('disconnected');
          
          // Auto-retry after error
          setTimeout(() => {
            if (!isCleaningUp) {
              console.log('Retrying connection after error');
              globalSignalRStarted.value = false;
              reconnect();
            }
          }, 5000);
        });
        
      // Cleanup function
      return () => {
        isCleaningUp = true;
        console.log('SignalR provider unmounting - cleanup');
        
        if (connectionCheckInterval) {
          clearInterval(connectionCheckInterval);
        }
        
        // Don't stop connection on unmount to maintain it across renders
        console.log('Maintaining connection during component lifecycle');
      };
    }
    
    return () => {};
  }, [handleJobUpdate, updateConnectionStatus, reconnect]);
  
  // Context value
  const value: SignalRContextState = {
    connectionStatus,
    messageCount,
    reconnect
  };
  
  return (
    <SignalRContext.Provider value={value}>
      {children}
    </SignalRContext.Provider>
  );
};

// Custom hook to use the SignalR context
export const useSignalR = (): SignalRContextState => {
  const context = useContext(SignalRContext);
  if (context === undefined) {
    throw new Error('useSignalR must be used within a SignalRProvider');
  }
  return context;
}; 