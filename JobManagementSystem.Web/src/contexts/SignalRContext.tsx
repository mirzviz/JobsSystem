import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { startConnection, stopConnection, getConnectionState, subscribeToStateChanges, JobProgressUpdate } from '../services/signalRService';
import { useJobs } from './JobContext';

// Global flag for persistent connection
export const globalSignalRStarted = { value: false };

// Type definitions for context
interface SignalRContextState {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  messageCount: number;
}

// Create the context
const SignalRContext = createContext<SignalRContextState | undefined>(undefined);

// Provider component
export const SignalRProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [messageCount, setMessageCount] = useState<number>(0);
  
  // Get access to job context for updating jobs
  const { updateJobProgress } = useJobs();
  
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
  
  // Initialize SignalR connection
  useEffect(() => {
    console.log('SignalR provider mounted');
    let isCleaningUp = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const initializeConnection = async () => {
      if (isCleaningUp) return;
      
      try {
        console.log('Initializing SignalR connection...');
        setConnectionStatus('connecting');
        await startConnection(handleJobUpdate);
        if (!isCleaningUp) {
          console.log('SignalR connection established');
          setConnectionStatus('connected');
        }
      } catch (error) {
        if (isCleaningUp) return;
        
        console.error('SignalR connection error:', error);
        setConnectionStatus('disconnected');
        
        // Auto-retry after error
        reconnectTimeout = setTimeout(() => {
          if (!isCleaningUp) {
            console.log('Retrying connection...');
            initializeConnection();
          }
        }, 5000);
      }
    };

    // Subscribe to state changes
    const handleStateChange = (state: HubConnectionState) => {
      if (isCleaningUp) return;
      
      console.log('SignalR state changed:', state);
      switch (state) {
        case HubConnectionState.Connected:
          setConnectionStatus('connected');
          break;
        case HubConnectionState.Connecting:
        case HubConnectionState.Reconnecting:
          setConnectionStatus('connecting');
          break;
        case HubConnectionState.Disconnected:
          setConnectionStatus('disconnected');
          // Auto reconnect when disconnected
          reconnectTimeout = setTimeout(() => {
            if (!isCleaningUp) {
              console.log('Auto-reconnecting...');
              initializeConnection();
            }
          }, 5000);
          break;
      }
    };

    // Start initial connection
    initializeConnection();
    
    // Subscribe to state changes
    subscribeToStateChanges(handleStateChange);
      
    // Cleanup function
    return () => {
      isCleaningUp = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      stopConnection().catch(console.error);
    };
  }, [handleJobUpdate]);
  
  // Context value
  const value: SignalRContextState = {
    connectionStatus,
    messageCount
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