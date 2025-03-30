import React, { useState } from 'react';
import { Job, JobStatus } from '../types/Job';

interface DebugPanelProps {
  jobs: Job[];
  messageCount: number;
  onReconnect: () => void;
  globalSignalRStarted: { value: boolean };
}

const DebugPanel: React.FC<DebugPanelProps> = React.memo(({ 
  jobs, 
  messageCount, 
  onReconnect, 
  globalSignalRStarted 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [testJobId, setTestJobId] = useState('');
  const [testProgress, setTestProgress] = useState(50);
  const [testStatus, setTestStatus] = useState<JobStatus>(JobStatus.Running);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>('');
  
  const runDiagnostics = () => {
    const connection = window.DEBUG_SIGNALR?.getConnection();
    let info = '';
    
    // Check SignalR connection
    info += `SignalR Connection: ${connection ? connection.state : 'Not established'}\n`;
    info += `Registered Callbacks: ${window.DEBUG_SIGNALR?.inspectCallbacks()?.length || 0}\n`;
    info += `Messages Received: ${messageCount}\n`;
    info += `Global SignalR Started: ${JSON.stringify(globalSignalRStarted)}\n`;
    
    // Check for active jobs
    info += `\nActive Jobs: ${jobs.length}\n`;
    if (jobs.length > 0) {
      info += `First Job: ${jobs[0].name} (${jobs[0].id})\n`;
      info += `Status: ${jobs[0].status}, Progress: ${jobs[0].progress}%\n`;
    }
    
    // Check server connection
    fetch('/api/jobs')
      .then(response => {
        info += `\nServer API Connection: ${response.status === 200 ? 'OK' : 'Failed'}\n`;
        setDiagnosticInfo(info);
        return response.json();
      })
      .then(data => {
        info += `Jobs from API: ${data.length}\n`;
        setDiagnosticInfo(info);
      })
      .catch(error => {
        info += `API Error: ${error.message}\n`;
        setDiagnosticInfo(info);
      });
      
    setDiagnosticInfo(info);
  };
  
  if (!isVisible) {
    return (
      <button 
        className="btn btn-sm btn-dark position-fixed" 
        style={{ bottom: '20px', right: '20px', opacity: 0.7 }}
        onClick={() => {
          setIsVisible(true);
          runDiagnostics();
        }}
      >
        <i className="bi bi-bug me-1"></i> Debug
      </button>
    );
  }
  
  return (
    <div className="card position-fixed shadow-lg" style={{ bottom: '20px', right: '20px', width: '400px', zIndex: 1000 }}>
      <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
        <span><i className="bi bi-bug me-1"></i> SignalR Debug</span>
        <div>
          <button 
            className="btn btn-sm btn-secondary me-2"
            onClick={runDiagnostics}
          >
            Run Diagnostics
          </button>
          <button 
            className="btn btn-sm btn-close btn-close-white" 
            onClick={() => setIsVisible(false)}
          />
        </div>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <button 
            className="btn btn-sm btn-primary me-2"
            onClick={() => window.DEBUG_SIGNALR?.testConnection()}
          >
            Test Connection
          </button>
          <button 
            className="btn btn-sm btn-info me-2"
            onClick={() => window.DEBUG_SIGNALR?.triggerTestEvent()}
          >
            Trigger Test Event
          </button>
          <button 
            className="btn btn-sm btn-danger"
            onClick={onReconnect}
          >
            Reconnect
          </button>
        </div>
        
        {diagnosticInfo && (
          <div className="mb-3">
            <div className="card bg-light">
              <div className="card-header d-flex justify-content-between align-items-center">
                <strong>Diagnostics</strong>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={runDiagnostics}
                >
                  Refresh
                </button>
              </div>
              <div className="card-body">
                <pre className="small m-0" style={{ whiteSpace: 'pre-wrap' }}>{diagnosticInfo}</pre>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-2">
          <label className="form-label">Job ID</label>
          <select 
            className="form-select form-select-sm"
            value={testJobId}
            onChange={(e) => setTestJobId(e.target.value)}
          >
            <option value="">Select a job</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>
                {job.name} ({job.id.substring(0, 8)})
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-2">
          <label className="form-label">Progress: {testProgress}%</label>
          <input 
            type="range" 
            className="form-range" 
            min="0" 
            max="100" 
            value={testProgress}
            onChange={(e) => setTestProgress(parseInt(e.target.value))}
          />
        </div>
        
        <div className="mb-3">
          <label className="form-label">Status</label>
          <select 
            className="form-select form-select-sm"
            value={testStatus}
            onChange={(e) => setTestStatus(e.target.value as JobStatus)}
          >
            {Object.values(JobStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        
        <button 
          className="btn btn-warning w-100"
          disabled={!testJobId}
          onClick={() => {
            if (testJobId && window.DEBUG_SIGNALR) {
              window.DEBUG_SIGNALR.simulateJobUpdate(testJobId, testProgress, testStatus);
            }
          }}
        >
          Simulate Job Update
        </button>
      </div>
    </div>
  );
});

export default DebugPanel; 