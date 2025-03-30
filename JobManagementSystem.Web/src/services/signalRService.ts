import * as signalR from '@microsoft/signalr';
import { JobStatus } from '../types/Job';

// Add global reference for debugging in the browser console
declare global {
  interface Window {
    DEBUG_SIGNALR: {
      getConnection: () => signalR.HubConnection | null;
      testConnection: () => void;
      simulateJobUpdate: (jobId: string, progress: number, status: JobStatus) => void;
      inspectCallbacks: () => Array<(update: JobProgressUpdate) => void>;
      triggerTestEvent: () => void;
    };
  }
}

export interface JobProgressUpdate {
  jobId: string;
  progress: number;
  status: JobStatus;
}

let connection: signalR.HubConnection | null = null;
let reconnectAttempt = 0;
let connectionLock = false; // Prevent concurrent connection operations
let startPromise: Promise<void> | null = null;
let registeredCallbacks: Array<(update: JobProgressUpdate) => void> = [];

// Add diagnostic logging to the top of the file
console.log('SignalR service module loaded');

// Register a callback for when job updates arrive
const registerCallback = (callback: (update: JobProgressUpdate) => void) => {
  if (!registeredCallbacks.includes(callback)) {
    registeredCallbacks.push(callback);
    console.log(`New callback registered. Total callbacks: ${registeredCallbacks.length}`);
  }
};

// Enhance the notifyAllCallbacks function with more logging
const notifyAllCallbacks = (update: JobProgressUpdate) => {
  console.log(`%c📨 SignalR message received:`, 'background: #4CAF50; color: white; padding: 2px 4px; border-radius: 2px;', update);
  console.log(`Notifying ${registeredCallbacks.length} callbacks with job ID: ${update.jobId}, status: ${update.status}, progress: ${update.progress}`);
  
  if (registeredCallbacks.length === 0) {
    console.warn('⚠️ No callbacks registered to receive updates!');
  }
  
  registeredCallbacks.forEach((callback, index) => {
    try {
      console.log(`Executing callback #${index+1}...`);
      callback(update);
      console.log(`Callback #${index+1} executed successfully`);
    } catch (error) {
      console.error(`Error in callback #${index+1}:`, error);
    }
  });
};

export const startConnection = (onJobUpdate: (update: JobProgressUpdate) => void): Promise<void> => {
  console.log(`%c🔌 startConnection called with callback:`, 'background: #2196F3; color: white; padding: 2px 4px; border-radius: 2px;', onJobUpdate);
  
  // Register the callback immediately, even before connection established
  registerCallback(onJobUpdate);
  
  // If already connecting, return the existing promise
  if (startPromise) {
    console.log('Connection already starting, returning existing promise');
    return startPromise;
  }

  // If already connected, just return resolved promise
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    console.log('SignalR connection already connected, reusing...');
    return Promise.resolve();
  }
  
  // If we're in a locked state, wait a bit
  if (connectionLock) {
    console.log('Connection lock active, waiting...');
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(startConnection(onJobUpdate));
      }, 500);
    });
  }

  connectionLock = true;
  
  // If we have a connection in a non-connected state, stop it and create a new one
  if (connection) {
    console.log('Stopping existing SignalR connection before creating a new one...');
    try {
      connection.stop();
    } catch (err) {
      console.error('Error stopping existing connection:', err);
    }
    connection = null;
  }

  console.log('Building new SignalR connection...');
  
  // Create the connection with explicit transport preferences
  connection = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/jobProgress')
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: retryContext => {
        reconnectAttempt++;
        // Implement exponential backoff with a maximum wait time
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        console.log(`SignalR reconnecting attempt #${reconnectAttempt} in ${delay}ms`);
        return delay;
      }
    })
    .configureLogging(signalR.LogLevel.Trace)  // Use Trace for maximum verbosity
    .build();

  // Set up connection event handlers with more verbose logging
  connection.onreconnecting(error => {
    console.log(`%c🔄 SignalR connection lost. Attempting to reconnect...`, 'background: #FF9800; color: white; padding: 2px 4px; border-radius: 2px;', error);
  });

  connection.onreconnected(connectionId => {
    console.log(`%c✅ SignalR connection reestablished. ConnectionId: ${connectionId}`, 'background: #4CAF50; color: white; padding: 2px 4px; border-radius: 2px;');
    reconnectAttempt = 0;
  });

  connection.onclose(error => {
    console.log(`%c❌ SignalR connection closed`, 'background: #F44336; color: white; padding: 2px 4px; border-radius: 2px;', error);
    connectionLock = false;
    startPromise = null;
  });

  // Register the ReceiveJobProgress event handler with enhanced logging
  console.log('Registering handler for ReceiveJobProgress event');
  connection.on('ReceiveJobProgress', (update: JobProgressUpdate) => {
    console.log(`%c📩 ReceiveJobProgress event triggered with data:`, 'background: #9C27B0; color: white; padding: 2px 4px; border-radius: 2px;', update);
    notifyAllCallbacks(update);
  });
  
  // Register for ALL possible event names that might be used
  console.log('Registering handlers for other possible event names');
  ['JobProgress', 'jobProgress', 'JobProgressUpdate', 'jobProgressUpdate', 'JobUpdate', 'jobUpdate'].forEach(eventName => {
    if (connection) {
      connection.on(eventName, (data: any) => {
        console.log(`%c📩 Received message for ${eventName}:`, 'background: #9C27B0; color: white; padding: 2px 4px; border-radius: 2px;', data);
        if (data.jobId && (data.progress !== undefined || data.status !== undefined)) {
          const update: JobProgressUpdate = {
            jobId: data.jobId,
            progress: data.progress || 0,
            status: data.status || JobStatus.Pending
          };
          notifyAllCallbacks(update);
        }
      });
    }
  });
  
  // Also register a catch-all handler for any message
  connection.on('ReceiveMessage', (message: any) => {
    console.log('Generic ReceiveMessage event:', message);
  });
  
  // Also register for simple testing messages to verify connectivity
  connection.on('TestMessage', (message: string) => {
    console.log(`%c🧪 SignalR test message received:`, 'background: #009688; color: white; padding: 2px 4px; border-radius: 2px;', message);
  });

  // Log all handlers registered
  console.log('All handlers registered on the connection:', connection ? connection : 'No connection established yet');

  // Start the connection with retry logic - store the promise so we can reuse it
  console.log('%c▶️ Starting SignalR connection...', 'background: #2196F3; color: white; padding: 2px 4px; border-radius: 2px;');
  
  startPromise = new Promise<void>((resolve, reject) => {
    // Add a small delay to allow other operations to complete
    setTimeout(() => {
      // Check if connection was disposed during the timeout
      if (!connection) {
        connectionLock = false;
        startPromise = null;
        reject(new Error('Connection was disposed while starting'));
        return;
      }

      connection.start()
        .then(() => {
          console.log('SignalR connection started successfully!');
          reconnectAttempt = 0;
          connectionLock = false;
          
          // Send a test method call to confirm connection is working
          if (connection && connection.state === signalR.HubConnectionState.Connected) {
            try {
              connection.invoke('JoinGroup', 'JobMonitor')
                .then(() => console.log('Joined JobMonitor group'))
                .catch(err => console.error('Error joining group:', err));
            } catch (error) {
              console.error('Error invoking JoinGroup:', error);
            }
          }
          
          resolve();
        })
        .catch(err => {
          console.error('Error starting SignalR connection:', err);
          // If connection failed, set it to null so future attempts create a new connection
          connection = null;
          connectionLock = false;
          startPromise = null;
          reject(err);
        });
    }, 100);
  });
  
  return startPromise;
};

export const stopConnection = async (): Promise<void> => {
  // Don't try to stop while we're in the connection process
  if (connectionLock) {
    console.log('Connection is currently being established, cannot stop yet');
    return Promise.resolve();
  }
  
  // Clear the startPromise since we're stopping
  startPromise = null;
  
  if (connection) {
    try {
      connectionLock = true;
      await connection.stop();
      console.log('SignalR connection stopped');
    } catch (err) {
      console.error('Error stopping SignalR connection:', err);
    } finally {
      connection = null;
      reconnectAttempt = 0;
      connectionLock = false;
    }
  }
};

// Add a method to check connection state
export const getConnectionState = (): signalR.HubConnectionState => {
  return connection ? connection.state : signalR.HubConnectionState.Disconnected;
};

// Add debugging functions
export const setupDebugFunctions = () => {
  console.log('Setting up SignalR debug functions on window.DEBUG_SIGNALR');
  window.DEBUG_SIGNALR = {
    // Get the current connection
    getConnection: () => connection,
    
    // Test the connection
    testConnection: () => {
      console.log(`%c🧪 Testing SignalR connection:`, 'background: #2196F3; color: white; padding: 2px 4px; border-radius: 2px;');
      console.log('Connection state:', connection ? connection.state : 'No connection');
      console.log('Registered callbacks:', registeredCallbacks.length);
      
      if (connection) {
        try {
          // Try to send a message to the server
          connection.invoke('JoinGroup', 'DebugTest').then(() => {
            console.log('Successfully sent test message to server');
          }).catch(err => {
            console.error('Failed to send test message:', err);
          });
          
          // Try direct job fetch to test if server responds
          console.log('Attempting direct API calls to test server connectivity...');
          fetch('/api/jobs')
            .then(response => response.json())
            .then(data => {
              console.log('Got jobs from API:', data);
              if (data && data.length > 0) {
                const job = data[0];
                console.log(`First job: ${job.name} (${job.id}) - status: ${job.status}, progress: ${job.progress}%`);
              }
            })
            .catch(error => console.error('API test failed:', error));
          
          // Try to check logs for any messages about SignalR
          console.log('Server events should arrive at these methods if they are being sent:');
          // Use any type to access internal properties
          const hubConn = connection as any;
          console.log('- ReceiveJobProgress:', hubConn.methods ? hubConn.methods['ReceiveJobProgress'] : 'Not found');
          console.log('- All registered methods:', hubConn.methods ? Object.keys(hubConn.methods) : 'None');
        } catch (err) {
          console.error('Error testing connection:', err);
        }
      } else {
        console.warn('No connection available to test');
      }
    },
    
    // Simulate a job update
    simulateJobUpdate: (jobId: string, progress: number, status: JobStatus) => {
      console.log(`%c🧪 Simulating job update:`, 'background: #9C27B0; color: white; padding: 2px 4px; border-radius: 2px;', {
        jobId, progress, status
      });
      
      const update: JobProgressUpdate = { jobId, progress, status };
      notifyAllCallbacks(update);
    },
    
    // Inspect callbacks
    inspectCallbacks: () => {
      console.log('Currently registered callbacks:', registeredCallbacks);
      return registeredCallbacks;
    },
    
    // Trigger a test event (as if it came from the server)
    triggerTestEvent: () => {
      console.log('Simulating a server-sent event');
      if (connection) {
        // @ts-ignore - Access internal method to simulate an event
        const hubConnection = connection as any;
        if (hubConnection.connection && hubConnection.connection.messageBuffer) {
          try {
            // Try to simulate a message being received
            const mockData = {
              type: 1, // SignalR message type
              target: 'ReceiveJobProgress',
              arguments: [{
                jobId: 'test-' + Date.now(),
                progress: Math.floor(Math.random() * 100),
                status: JobStatus.Running
              }]
            };
            hubConnection.processIncomingData(mockData);
            console.log('Test event triggered successfully');
          } catch (err) {
            console.error('Failed to trigger test event:', err);
          }
        } else {
          console.warn('Connection not fully established, cannot simulate event');
        }
      } else {
        console.warn('No connection available for test event');
      }
    }
  };
};

// Call this at the end of the file to set up debug functions
setupDebugFunctions(); 