import React, { useState } from 'react';
import { JobPriority } from '../types/Job';
import { createJob, CreateJobRequest } from '../services/jobService';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: () => void;
}

const CreateJobModal: React.FC<CreateJobModalProps> = ({ isOpen, onClose, onJobCreated }) => {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<JobPriority>(JobPriority.Regular);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Job name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const newJob: CreateJobRequest = {
        name,
        priority
      };
      
      await createJob(newJob);
      onJobCreated();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('Failed to create job. Please try again.');
    }
  };

  const resetForm = () => {
    setName('');
    setPriority(JobPriority.Regular);
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create New Job</h5>
            <button 
              type="button" 
              className="btn-close" 
              aria-label="Close" 
              onClick={() => {
                resetForm();
                onClose();
              }}
            />
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="jobName" className="form-label">Job Name</label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  id="jobName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              <div className="mb-3">
                <label htmlFor="priority" className="form-label">Priority</label>
                <select
                  className="form-select"
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as JobPriority)}
                >
                  <option value={JobPriority.Regular}>Regular</option>
                  <option value={JobPriority.High}>High</option>
                </select>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Create Job</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateJobModal; 