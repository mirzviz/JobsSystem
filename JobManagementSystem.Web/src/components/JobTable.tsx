import React, { useState } from 'react';
import { Job, JobStatus, JobPriority } from '../types/Job';
import { deleteJob, restartJob, stopJob } from '../services/jobService';
import JobDetailModal from './JobDetailModal';

interface JobTableProps {
  jobs: Job[];
  onJobAction: () => void;
}

const JobTable: React.FC<JobTableProps> = React.memo(({ jobs, onJobAction }) => {
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const [sortField, setSortField] = useState<keyof Job>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleSort = (field: keyof Job) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAction = async (action: 'stop' | 'restart' | 'delete', job: Job) => {
    try {
      if (action === 'stop') {
        await stopJob(job.id);
      } else if (action === 'restart') {
        await restartJob(job.id);
      } else if (action === 'delete') {
        if (window.confirm(`Are you sure you want to delete job "${job.name}"?`)) {
          await deleteJob(job.id);
        } else {
          return;
        }
      }
      onJobAction();
    } catch (error) {
      console.error(`Failed to ${action} job:`, error);
      alert(`Failed to ${action} job. Please try again.`);
    }
  };

  const showJobDetails = (job: Job) => {
    setSelectedJob(job);
    setIsDetailModalOpen(true);
  };

  const closeJobDetails = () => {
    setIsDetailModalOpen(false);
    setSelectedJob(null);
  };

  const filteredJobs = jobs.filter(job => {
    const nameMatch = job.name.toLowerCase().includes(searchName.toLowerCase());
    const statusMatch = !statusFilter || job.status === statusFilter;
    return nameMatch && statusMatch;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === undefined || bValue === undefined) return 0;
    if (aValue === bValue) return 0;
    
    const comparison = aValue < bValue ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getProgressBarColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.Running: return 'bg-primary';
      case JobStatus.Completed: return 'bg-success';
      case JobStatus.Failed: return 'bg-danger';
      case JobStatus.Stopped: return 'bg-warning';
      default: return 'bg-secondary';
    }
  };

  const getStatusBadgeColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.Pending: return 'bg-secondary';
      case JobStatus.Running: return 'bg-primary';
      case JobStatus.Completed: return 'bg-success';
      case JobStatus.Failed: return 'bg-danger';
      case JobStatus.Stopped: return 'bg-warning';
      default: return 'bg-secondary';
    }
  };

  const getSortIcon = (field: keyof Job) => {
    if (field !== sortField) return <i className="bi bi-arrow-down-up text-muted small ms-1"></i>;
    return sortDirection === 'asc' 
      ? <i className="bi bi-sort-down-alt ms-1"></i>
      : <i className="bi bi-sort-down ms-1"></i>;
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case JobStatus.Pending: return <i className="bi bi-hourglass me-1"></i>;
      case JobStatus.Running: return <i className="bi bi-play-fill me-1"></i>;
      case JobStatus.Completed: return <i className="bi bi-check-circle-fill me-1"></i>;
      case JobStatus.Failed: return <i className="bi bi-x-circle-fill me-1"></i>;
      case JobStatus.Stopped: return <i className="bi bi-pause-fill me-1"></i>;
      default: return null;
    }
  };

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">
            <i className="bi bi-list-task me-2"></i>
            Job Dashboard
          </h5>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by job name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-funnel"></i>
                </span>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as JobStatus | '')}
                >
                  <option value="">All Statuses</option>
                  {Object.values(JobStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-3 text-end">
              <span className="badge bg-secondary">
                {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                    ID {getSortIcon('id')}
                  </th>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                    Job Name {getSortIcon('name')}
                  </th>
                  <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>
                    Priority {getSortIcon('priority')}
                  </th>
                  <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>
                    Created {getSortIcon('createdAt')}
                  </th>
                  <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                    Status {getSortIcon('status')}
                  </th>
                  <th>Progress</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <i className="bi bi-inbox display-4 d-block text-muted"></i>
                      <p className="mt-2">No jobs found</p>
                    </td>
                  </tr>
                ) : (
                  sortedJobs.map((job) => (
                    <tr key={job.id} onClick={() => showJobDetails(job)} style={{ cursor: 'pointer' }}>
                      <td><code>{job.id.substring(0, 8)}</code></td>
                      <td>{job.name}</td>
                      <td>
                        <span className={`badge ${job.priority === JobPriority.High ? 'bg-danger' : 'bg-info'}`}>
                          {job.priority === JobPriority.High ? <i className="bi bi-stars me-1"></i> : <i className="bi bi-arrow-down-circle me-1"></i>}
                          {job.priority}
                        </span>
                      </td>
                      <td>
                        <span title={new Date(job.createdAt).toLocaleString()}>
                          <i className="bi bi-clock me-1"></i>
                          {new Date(job.createdAt).toLocaleString(undefined, { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          {job.status}
                        </span>
                      </td>
                      <td style={{ width: '15%' }}>
                        <div className="progress" style={{ height: '20px' }}>
                          <div
                            className={`progress-bar ${getProgressBarColor(job.status)}`}
                            role="progressbar"
                            style={{ width: `${job.progress}%` }}
                            aria-valuenow={job.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            {job.progress}%
                          </div>
                        </div>
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="btn-group" role="group">
                          {job.status === JobStatus.Running && (
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => handleAction('stop', job)}
                              title="Stop Job"
                            >
                              <i className="bi bi-pause-fill"></i>
                            </button>
                          )}
                          {(job.status === JobStatus.Failed || job.status === JobStatus.Stopped) && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleAction('restart', job)}
                              title="Restart Job"
                            >
                              <i className="bi bi-arrow-clockwise"></i>
                            </button>
                          )}
                          {(job.status === JobStatus.Completed || job.status === JobStatus.Failed) && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleAction('delete', job)}
                              title="Delete Job"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <JobDetailModal 
        job={selectedJob} 
        isOpen={isDetailModalOpen} 
        onClose={closeJobDetails} 
      />
    </>
  );
}, (prevProps, nextProps) => {
  if (prevProps.jobs === nextProps.jobs) {
    return true;
  }
  
  if (prevProps.jobs.length !== nextProps.jobs.length) {
    return false;
  }
  
  const jobsChanged = nextProps.jobs.some((nextJob, index) => {
    const prevJob = prevProps.jobs[index];
    return (
      prevJob.id !== nextJob.id ||
      prevJob.status !== nextJob.status ||
      prevJob.progress !== nextJob.progress
    );
  });
  
  return !jobsChanged;
});

export default JobTable; 