import React from 'react';
import { Job, JobStatus } from '../types/Job';

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, isOpen, onClose }) => {
  if (!isOpen || !job) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusClass = (status: JobStatus) => {
    switch (status) {
      case JobStatus.Pending: return 'text-secondary';
      case JobStatus.Running: return 'text-primary';
      case JobStatus.Completed: return 'text-success';
      case JobStatus.Failed: return 'text-danger';
      case JobStatus.Stopped: return 'text-warning';
      default: return 'text-secondary';
    }
  };

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-info-circle me-2"></i>
              Job Details
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              aria-label="Close" 
              onClick={onClose}
            />
          </div>
          <div className="modal-body">
            <div className="row mb-4">
              <div className="col-md-8">
                <h4>{job.name}</h4>
                <div className="d-flex align-items-center mb-3">
                  <span className={`badge ${job.status === JobStatus.Completed ? 'bg-success' : job.status === JobStatus.Failed ? 'bg-danger' : job.status === JobStatus.Running ? 'bg-primary' : job.status === JobStatus.Stopped ? 'bg-warning' : 'bg-secondary'}`}>
                    {job.status}
                  </span>
                  {job.errorMessage && (
                    <span className="ms-2 text-danger">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      Error occurred
                    </span>
                  )}
                </div>
              </div>
              <div className="col-md-4 text-end">
                <div className="text-muted small">
                  <div>ID: <code>{job.id}</code></div>
                  <div>Priority: <span className="badge bg-info">{job.priority}</span></div>
                </div>
              </div>
            </div>

            {job.status !== JobStatus.Pending && (
              <div className="mb-3">
                <label className="form-label">Progress</label>
                <div className="progress" style={{ height: '25px' }}>
                  <div 
                    className={`progress-bar ${job.status === JobStatus.Completed ? 'bg-success' : job.status === JobStatus.Failed ? 'bg-danger' : job.status === JobStatus.Running ? 'bg-primary' : job.status === JobStatus.Stopped ? 'bg-warning' : 'bg-secondary'}`} 
                    role="progressbar" 
                    style={{ width: `${job.progress}%` }}
                    aria-valuenow={job.progress} 
                    aria-valuemin={0} 
                    aria-valuemax={100}
                  >
                    {job.progress}%
                  </div>
                </div>
              </div>
            )}

            {job.errorMessage && (
              <div className="alert alert-danger">
                <h6 className="alert-heading"><i className="bi bi-x-circle me-2"></i>Error Message</h6>
                <hr />
                <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{job.errorMessage}</pre>
              </div>
            )}

            <div className="card mt-3">
              <div className="card-header">
                <i className="bi bi-clock-history me-2"></i>
                Timeline
              </div>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>
                    <i className="bi bi-plus-circle me-2 text-success"></i>
                    Created
                  </span>
                  <span className="text-muted">{formatDate(job.createdAt)}</span>
                </li>
                
                {job.startedAt && (
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-play-circle me-2 text-primary"></i>
                      Started
                    </span>
                    <span className="text-muted">{formatDate(job.startedAt)}</span>
                  </li>
                )}
                
                {job.completedAt && (
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <i className={`bi me-2 ${job.status === JobStatus.Completed ? 'bi-check-circle text-success' : 'bi-x-circle text-danger'}`}></i>
                      {job.status === JobStatus.Completed ? 'Completed' : 'Ended'}
                    </span>
                    <span className="text-muted">{formatDate(job.completedAt)}</span>
                  </li>
                )}

                {job.lastClaimTime && (
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-arrow-repeat me-2 text-info"></i>
                      Last Claimed
                    </span>
                    <span className="text-muted">{formatDate(job.lastClaimTime)}</span>
                  </li>
                )}
              </ul>
            </div>

            {job.workerNodeId && (
              <div className="mt-3">
                <label className="form-label text-muted">Worker Node</label>
                <div><code>{job.workerNodeId}</code></div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailModal; 