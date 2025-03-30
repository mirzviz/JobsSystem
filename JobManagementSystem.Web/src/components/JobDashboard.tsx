import React, { useState, useCallback } from 'react';
import JobTable from './JobTable';
import CreateJobModal from './CreateJobModal';
import Notifications from './Notifications';
import DebugPanel from './DebugPanel';
import { useJobs } from '../contexts/JobContext';
import { useSignalR } from '../contexts/SignalRContext';
import { useNotifications } from '../contexts/NotificationContext';
import { createJob } from '../services/jobService';
import { JobPriority, Job } from '../types/Job';
import { createJobNotification } from './Notifications';
import { globalSignalRStarted } from '../contexts/SignalRContext';

// Extract the Header to its own component
const Header = React.memo(() => {
  console.log('Header component rendering');
  const { isLoading, fetchJobs } = useJobs();
  const { connectionStatus, messageCount, reconnect } = useSignalR();
  const { addNotification } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Create test job function
  const createTestJob = useCallback(async () => {
    try {
      const newJob = {
        name: `Test Job ${new Date().toLocaleTimeString()}`,
        priority: JobPriority.High
      };
      
      const createdJob = await createJob(newJob);
      console.log('Test job created:', createdJob);
      addNotification(createJobNotification(
        createdJob.id, 
        createdJob.name, 
        createdJob.status
      ));
    } catch (error) {
      console.error('Error creating test job:', error);
    }
  }, [addNotification]);

  return (
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
              <i className="bi bi-wifi me-1"></i> Connected ({messageCount} updates)
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
          <button 
            className="btn btn-sm btn-light ms-2" 
            onClick={reconnect}
            title="Reconnect SignalR"
          >
            <i className="bi bi-arrow-repeat"></i>
          </button>
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
          className="btn btn-primary me-2" 
          onClick={() => setIsModalOpen(true)}
        >
          <i className="bi bi-plus-circle me-1"></i>
          Add New Job
        </button>
        <button 
          className="btn btn-outline-secondary" 
          onClick={createTestJob}
          title="Create a test job to verify real-time updates"
        >
          <i className="bi bi-lightning me-1"></i>
          Test Update
        </button>
        
        {/* Modal outside Header component return value but controlled by it*/}
        <CreateJobModalContainer isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </div>
  );
});

// CreateJobModal container to isolate state
const CreateJobModalContainer = React.memo(({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  console.log('CreateJobModal container rendering:', isOpen ? 'open' : 'closed');
  const { addJob } = useJobs();
  const { addNotification } = useNotifications();
  
  const handleJobCreated = useCallback((job: Job) => {
    addJob(job);
    addNotification(createJobNotification(job.id, job.name, job.status));
    onClose();
  }, [addJob, addNotification, onClose]);

  return (
    <CreateJobModal
      isOpen={isOpen}
      onClose={onClose}
      onJobCreated={handleJobCreated}
    />
  );
});

// JobTableContainer to isolate state
const JobTableContainer = React.memo(() => {
  console.log('JobTable container rendering');
  const { jobs, isLoading, fetchJobs } = useJobs();
  
  return isLoading ? (
    <div className="card shadow-sm p-5">
      <div className="d-flex flex-column justify-content-center align-items-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted">Loading jobs...</p>
      </div>
    </div>
  ) : (
    <JobTable jobs={jobs} onJobAction={fetchJobs} />
  );
});

// Last updated info with isolated re-renders
const LastUpdatedInfo = React.memo(() => {
  console.log('LastUpdated info rendering');
  const { lastRefreshed } = useJobs();
  
  return (
    <div className="mb-3 text-muted small">
      <i className="bi bi-clock me-1"></i>
      Last updated: {lastRefreshed.toLocaleTimeString()}
    </div>
  );
});

// Error display component
const ErrorDisplay = React.memo(() => {
  console.log('Error display rendering');
  const { error } = useJobs();
  const { reconnect } = useSignalR();
  
  if (!error) return null;
  
  return (
    <div className="alert alert-danger" role="alert">
      <i className="bi bi-exclamation-triangle-fill me-2"></i>
      {error}
      <button 
        className="btn btn-sm btn-outline-danger ms-3"
        onClick={reconnect}
      >
        Reconnect
      </button>
    </div>
  );
});

// NotificationContainer to isolate notification state
const NotificationContainer = React.memo(() => {
  console.log('Notification container rendering');
  const { notifications, dismissNotification } = useNotifications();
  
  return (
    <Notifications 
      notifications={notifications} 
      onDismiss={dismissNotification} 
    />
  );
});

// Debug panel container
const DebugPanelContainer = React.memo(() => {
  console.log('Debug panel container rendering');
  const { jobs } = useJobs();
  const { messageCount, reconnect } = useSignalR();
  
  return (
    <DebugPanel 
      jobs={jobs}
      messageCount={messageCount}
      onReconnect={reconnect}
      globalSignalRStarted={globalSignalRStarted}
    />
  );
});

// Footer component
const Footer = React.memo(() => {
  console.log('Footer rendering');
  return (
    <footer className="mt-5 mb-3 text-center text-muted">
      <hr />
      <small>Job Management System &copy; {new Date().getFullYear()}</small>
    </footer>
  );
});

// Main dashboard component that composes all the pieces
const JobDashboard: React.FC = React.memo(() => {
  console.log('%c📱 JobDashboard component rendering', 'background: #673AB7; color: white; padding: 2px 4px; border-radius: 2px;');
  
  // Call the hook at the top level of the component
  const { fetchJobs } = useJobs();
  
  // Fetch jobs on mount - only here to ensure data loads initially
  React.useEffect(() => {
    console.log('JobDashboard mounted - fetching jobs');
    fetchJobs();
  }, [fetchJobs]); // Add fetchJobs to dependency array
  
  return (
    <div className="container-fluid mt-4">
      <Header />
      <ErrorDisplay />
      <LastUpdatedInfo />
      <JobTableContainer />
      <NotificationContainer />
      <DebugPanelContainer />
      <Footer />
    </div>
  );
});

export default JobDashboard; 