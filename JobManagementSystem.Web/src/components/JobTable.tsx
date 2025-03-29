import React, { useState } from 'react';
import { Job, JobStatus, JobPriority } from '../types/Job';
import { deleteJob, restartJob, stopJob } from '../services/jobService';

interface JobTableProps {
  jobs: Job[];
  onJobAction: () => void;
}

const JobTable: React.FC<JobTableProps> = ({ jobs, onJobAction }) => {
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const [sortField, setSortField] = useState<keyof Job>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const filteredJobs = jobs.filter(job => {
    const nameMatch = job.name.toLowerCase().includes(searchName.toLowerCase());
    const statusMatch = !statusFilter || job.status === statusFilter;
    return nameMatch && statusMatch;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
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

  return (
    <div className="card">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">Job Dashboard</h5>
      </div>
      <div className="card-body">
        <div className="row mb-3">
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="Search by job name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div className="col-md-4">
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

        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-light">
              <tr>
                <th onClick={() => handleSort('id')}>#</th>
                <th onClick={() => handleSort('name')}>Job Name</th>
                <th onClick={() => handleSort('priority')}>Priority</th>
                <th onClick={() => handleSort('createdAt')}>Created</th>
                <th onClick={() => handleSort('status')}>Status</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center">No jobs found</td>
                </tr>
              ) : (
                sortedJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.id.substring(0, 8)}</td>
                    <td>{job.name}</td>
                    <td>
                      <span className={`badge ${job.priority === JobPriority.High ? 'bg-danger' : 'bg-info'}`}>
                        {job.priority}
                      </span>
                    </td>
                    <td>{new Date(job.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td>
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
                    <td>
                      {job.status === JobStatus.Running && (
                        <button
                          className="btn btn-sm btn-warning me-1"
                          onClick={() => handleAction('stop', job)}
                        >
                          Stop
                        </button>
                      )}
                      {(job.status === JobStatus.Failed || job.status === JobStatus.Stopped) && (
                        <button
                          className="btn btn-sm btn-primary me-1"
                          onClick={() => handleAction('restart', job)}
                        >
                          Restart
                        </button>
                      )}
                      {(job.status === JobStatus.Completed || job.status === JobStatus.Failed) && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleAction('delete', job)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default JobTable; 