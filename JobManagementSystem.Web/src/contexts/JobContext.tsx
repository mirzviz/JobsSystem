import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Job, JobStatus, JobPriority } from '../types/Job';
import { getJobs } from '../services/jobService';
import { JobProgressUpdate } from '../services/signalRService';
import { createJobNotification, Notification } from '../components/Notifications';

// Define the context state
interface JobContextState {
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  lastRefreshed: Date;
}

// Define the possible actions
type JobAction = 
  | { type: 'SET_JOBS'; payload: Job[] }
  | { type: 'ADD_JOB'; payload: Job }
  | { type: 'UPDATE_JOB'; payload: { jobId: string; progress: number; status: JobStatus } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REFRESH_TIMESTAMP' };

// Context interface with state and dispatch
interface JobContextValue extends JobContextState {
  fetchJobs: () => Promise<void>;
  addJob: (job: Job) => void;
  updateJobProgress: (update: JobProgressUpdate) => Notification | null;
}

// Create the context
const JobContext = createContext<JobContextValue | undefined>(undefined);

// Add this interface for notifications
declare global {
  interface Window {
    latestNotification: Notification | null;
  }
}

// Initialize the global property
if (typeof window !== 'undefined') {
  window.latestNotification = null;
}

// Reducer to handle state updates
const jobReducer = (state: JobContextState, action: JobAction): JobContextState => {
  switch (action.type) {
    case 'SET_JOBS':
      return {
        ...state,
        jobs: [...action.payload].sort((a, b) => {
          // First sort by creation time
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          if (timeA !== timeB) return timeB - timeA; // Newest first
          // If creation times are equal, sort by ID for consistency
          return a.id.localeCompare(b.id);
        }),
        lastRefreshed: new Date()
      };
    case 'ADD_JOB':
      // Check if job already exists
      const existingJob = state.jobs.find(job => job.id === action.payload.id);
      if (existingJob) {
        // If job exists, don't update it - this prevents overwriting existing jobs
        return state;
      }
      // Add new job to the end without sorting
      return {
        ...state,
        jobs: [...state.jobs, action.payload]
      };
    case 'UPDATE_JOB':
      // Try string comparison first
      let jobIndex = state.jobs.findIndex(job => job.id === action.payload.jobId);
      
      // If not found, try numeric comparison
      if (jobIndex === -1) {
        const numericId = parseInt(action.payload.jobId);
        jobIndex = state.jobs.findIndex(job => {
          const jobNumericId = parseInt(job.id);
          return !isNaN(jobNumericId) && !isNaN(numericId) && jobNumericId === numericId;
        });
      }
      
      // If still not found, don't update state
      if (jobIndex === -1) {
        return state;
      }
      
      // Check if actual values changed before updating
      const jobToUpdate = state.jobs[jobIndex];
      if (jobToUpdate.progress === action.payload.progress && 
          jobToUpdate.status === action.payload.status) {
        return state;
      }
      
      // Create new array with updated job at same index
      const updatedJobs = [...state.jobs];
      updatedJobs[jobIndex] = {
        ...jobToUpdate,  // Keep ALL existing properties
        progress: action.payload.progress,
        status: action.payload.status
      };
      
      return {
        ...state,
        jobs: updatedJobs  // Maintain original array order
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    case 'REFRESH_TIMESTAMP':
      return {
        ...state,
        lastRefreshed: new Date()
      };
    default:
      return state;
  }
};

// Provider component
export const JobProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initial state
  const initialState: JobContextState = {
    jobs: [],
    isLoading: false,
    error: null,
    lastRefreshed: new Date()
  };
  
  // Create reducer
  const [state, dispatch] = useReducer(jobReducer, initialState);
  
  // Define actions
  const fetchJobs = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const jobsData = await getJobs();
      dispatch({ type: 'SET_JOBS', payload: jobsData });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch jobs. Please refresh to try again.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);
  
  const addJob = useCallback((job: Job) => {
    dispatch({ type: 'ADD_JOB', payload: job });
  }, []);
  
  const updateJobProgress = useCallback((update: JobProgressUpdate): Notification | null => {
    // First try to find by exact string match
    let jobToUpdate = state.jobs.find(job => job.id === update.jobId.toString());

    // If not found, try numeric comparison (for cases where backend sends numeric IDs)
    if (!jobToUpdate) {
      const numericId = typeof update.jobId === 'number' ? update.jobId : parseInt(update.jobId);
      jobToUpdate = state.jobs.find(job => {
        const jobNumericId = parseInt(job.id);
        return !isNaN(jobNumericId) && !isNaN(numericId) && jobNumericId === numericId;
      });
    }

    if (!jobToUpdate) {
      console.log(`Job ${update.jobId} not found in current state`);
      return null;  // Don't create new jobs for updates
    }
    
    // Only dispatch update if progress or status has changed
    if (jobToUpdate.progress !== update.progress || jobToUpdate.status !== update.status) {
      dispatch({ 
        type: 'UPDATE_JOB', 
        payload: {
          jobId: jobToUpdate.id,
          progress: update.progress,
          status: update.status
        }
      });
    }
    
    // Return a notification if the status changed
    if (jobToUpdate.status !== update.status) {
      return createJobNotification(jobToUpdate.id, jobToUpdate.name, update.status);
    }
    
    return null;
  }, [state.jobs]);
  
  // Create context value
  const value: JobContextValue = {
    ...state,
    fetchJobs,
    addJob,
    updateJobProgress
  };
  
  return (
    <JobContext.Provider value={value}>
      {children}
    </JobContext.Provider>
  );
};

// Custom hook to use the context
export const useJobs = (): JobContextValue => {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
}; 