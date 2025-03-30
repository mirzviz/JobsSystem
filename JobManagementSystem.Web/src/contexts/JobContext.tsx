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
        jobs: action.payload,
        lastRefreshed: new Date()
      };
    case 'ADD_JOB':
      // Check if job already exists
      const existingJob = state.jobs.find(job => job.id === action.payload.id);
      if (existingJob) {
        // If job exists, update it instead of adding
        return {
          ...state,
          jobs: state.jobs.map(job =>
            job.id === action.payload.id ? { ...action.payload } : job
          )
        };
      }
      // If job doesn't exist, add it
      return {
        ...state,
        jobs: [...state.jobs, action.payload]
      };
    case 'UPDATE_JOB':
      // Convert jobId to string to ensure consistent comparison
      const jobIdToUpdate = action.payload.jobId.toString();
      
      // If job is not found, don't update state
      if (!state.jobs.some(job => job.id.toString() === jobIdToUpdate)) {
        return state;
      }
      
      // Check if actual values changed before updating
      const jobToUpdate = state.jobs.find(job => job.id.toString() === jobIdToUpdate);
      if (jobToUpdate && 
          jobToUpdate.progress === action.payload.progress && 
          jobToUpdate.status === action.payload.status) {
        return state;
      }
      
      // Create a new jobs array but only if the job actually changes
      const updatedJobs = state.jobs.map(job => 
        job.id.toString() === jobIdToUpdate
          ? { ...job, progress: action.payload.progress, status: action.payload.status }
          : job
      );
      
      return {
        ...state,
        jobs: updatedJobs
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
    // Convert jobId to string if it's a number
    const jobId = typeof update.jobId === 'number' ? update.jobId.toString() : update.jobId;
    
    // We can't pass a function to dispatch in useReducer, we need to use the current state directly
    const jobToUpdate = state.jobs.find(job => job.id.toString() === jobId.toString());
    
    if (!jobToUpdate) {
      console.log(`Job ${jobId} not found in current state, adding placeholder`);
      // Add the job to state
      dispatch({ 
        type: 'ADD_JOB', 
        payload: {
          id: jobId.toString(),  // Ensure ID is string
          name: `Job ${jobId.toString().substring(0, 8)}`,  // Temporary name
          status: update.status,
          progress: update.progress,
          priority: JobPriority.Regular,  // Default priority
          createdAt: new Date().toISOString()
        }
      });
      return null;
    }
    
    // Update existing job
    dispatch({ 
      type: 'UPDATE_JOB', 
      payload: {
        jobId: jobId.toString(),  // Ensure ID is string
        progress: update.progress,
        status: update.status
      }
    });
    
    // Return a notification if the status changed
    if (jobToUpdate.status !== update.status) {
      return createJobNotification(jobToUpdate.id, jobToUpdate.name, update.status);
    }
    
    return null;
  }, [state.jobs]); // We need state.jobs to check for existing jobs
  
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