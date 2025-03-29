import React, { useEffect, useState, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import JobTable from './components/JobTable';
import CreateJobModal from './components/CreateJobModal';
import Notifications, { Notification, createJobNotification } from './components/Notifications';
import { getJobs } from './services/jobService';
import { startConnection, stopConnection, JobProgressUpdate } from './services/signalRService';
import { Job, JobStatus } from './types/Job';

const App: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const jobsData = await getJobs();
      setJobs(jobsData);
      setError(null);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setError('Failed to fetch jobs. Please refresh the page to try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 5)); // Keep only 5 most recent
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleJobUpdate = (update: JobProgressUpdate) => {
    setJobs((prevJobs) => {
      const updatedJobs = prevJobs.map((job) => {
        if (job.id === update.jobId) {
          // Check if status changed to create notification
          if (job.status !== update.status) {
            const notification = createJobNotification(job.id, job.name, update.status);
            addNotification(notification);
          }
          
          return { ...job, progress: update.progress, status: update.status };
        }
        return job;
      });
      
      // If we didn't find the job, it might be a new one, so fetch all jobs
      if (!updatedJobs.some(job => job.id === update.jobId)) {
        fetchJobs();
      }
      
      return updatedJobs;
    });
  };

  useEffect(() => {
    fetchJobs();

    // Setup SignalR connection
    setConnectionStatus('connecting');
    startConnection(handleJobUpdate)
      .then(() => {
        setConnectionStatus('connected');
      })
      .catch((error) => {
        console.error('SignalR connection error:', error);
        setConnectionStatus('disconnected');
        setError('Failed to establish real-time connection. Job updates may be delayed.');
      });

    // Cleanup on unmount
    return () => {
      stopConnection();
    };
  }, [fetchJobs]);

  const handleJobAction = () => {
    fetchJobs();
  };

  const handleJobCreated = (job: Job) => {
    setJobs(prev => [...prev, job]);
    addNotification(createJobNotification(job.id, job.name, job.status));
    setIsModalOpen(false);
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row mb-4">
        <div className="col">
          <h1 className="display-5">
            <i className="bi bi-clipboard2-data me-2"></i>
            Job Management System
          </h1>
          <p className="lead">Monitor and manage your background jobs in real-time</p>
        </div>
        <div className="col-auto align-self-center d-flex">
          <div className="me-3">
            {connectionStatus === 'connected' ? (
              <span className="badge bg-success">
                <i className="bi bi-wifi me-1"></i> Connected
              </span>
            ) : connectionStatus === 'connecting' ? (
              <span className="badge bg-warning">
                <i className="bi bi-wifi-1 me-1"></i> Connecting...
              </span>
            ) : (
              <span className="badge bg-danger">
                <i className="bi bi-wifi-off me-1"></i> Disconnected
              </span>
            )}
          </div>
          <button 
            className="btn btn-outline-primary me-2" 
            onClick={fetchJobs}
            disabled={isLoading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setIsModalOpen(true)}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Add New Job
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      <div className="mb-3 text-muted small">
        <i className="bi bi-clock me-1"></i>
        Last updated: {lastRefreshed.toLocaleTimeString()}
      </div>

      {isLoading ? (
        <div className="card shadow-sm p-5">
          <div className="d-flex flex-column justify-content-center align-items-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading jobs...</p>
          </div>
        </div>
      ) : (
        <JobTable jobs={jobs} onJobAction={handleJobAction} />
      )}

      <CreateJobModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onJobCreated={handleJobCreated}
      />

      <Notifications 
        notifications={notifications} 
        onDismiss={dismissNotification} 
      />

      <footer className="mt-5 mb-3 text-center text-muted">
        <hr />
        <small>Job Management System &copy; {new Date().getFullYear()}</small>
      </footer>
    </div>
  );
};

export default App; 