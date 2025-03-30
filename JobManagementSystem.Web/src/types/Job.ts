export enum JobPriority {
  Regular = 'Regular',
  High = 'High'
}

export enum JobStatus {
  Pending = 'Pending',
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
  Stopped = 'Stopped'
}

export interface Job {
  id: string;  // Always store as string internally
  name: string;
  priority: JobPriority;
  status: JobStatus;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  workerNodeId?: string;
  lastClaimTime?: string;
} 