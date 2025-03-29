import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import JobTable from './components/JobTable';
import CreateJobModal from './components/CreateJobModal';
import { getJobs } from './services/jobService';
import { startConnection, stopConnection, JobProgressUpdate } from './services/signalRService';
import { Job } from './types/Job';

const App: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const jobsData = await getJobs();
      setJobs(jobsData);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setError('Failed to fetch jobs. Please refresh the page to try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobUpdate = (update: JobProgressUpdate) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === update.jobId
          ? { ...job, progress: update.progress, status: update.status }
          : job
      )
    );
  };

  useEffect(() => {
    fetchJobs();

    // Setup SignalR connection
    startConnection(handleJobUpdate).catch((error) => {
      console.error('SignalR connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      stopConnection();
    };
  }, []);

  const handleJobAction = () => {
    fetchJobs();
  };

  return (
    <div className="container mt-4">
      <div className="row mb-4">
        <div className="col">
          <h1 className="display-5">Job Management System</h1>
          <p className="lead">Monitor and manage your background jobs in real-time</p>
        </div>
        <div className="col-auto align-self-center">
          <button 
            className="btn btn-primary" 
            onClick={() => setIsModalOpen(true)}
          >
            Add New Job
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="d-flex justify-content-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <JobTable jobs={jobs} onJobAction={handleJobAction} />
      )}

      <CreateJobModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onJobCreated={fetchJobs}
      />

      <footer className="mt-5 mb-3 text-center text-muted">
        <hr />
        <small>Job Management System &copy; {new Date().getFullYear()}</small>
      </footer>
    </div>
  );
};

export default App; 