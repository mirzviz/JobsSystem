import axios from 'axios';
import { Job, JobPriority, JobStatus } from '../types/Job';

const API_URL = '/api/jobs';

export interface CreateJobRequest {
  name: string;
  priority: JobPriority;
  scheduledStartTime?: Date;
}

export const getJobs = async (): Promise<Job[]> => {
  const response = await axios.get<Job[]>(API_URL);
  return response.data;
};

export const getJob = async (id: string): Promise<Job> => {
  const response = await axios.get<Job>(`${API_URL}/${id}`);
  return response.data;
};

export const createJob = async (job: CreateJobRequest): Promise<Job> => {
  const response = await axios.post<Job>(API_URL, job);
  return response.data;
};

export const updateJobProgress = async (id: string, progress: number): Promise<Job> => {
  const response = await axios.put<Job>(`${API_URL}/${id}/progress`, progress);
  return response.data;
};

export const updateJobStatus = async (id: string, status: JobStatus): Promise<Job> => {
  const response = await axios.put<Job>(`${API_URL}/${id}/status`, status);
  return response.data;
};

export const stopJob = async (id: string): Promise<Job> => {
  const response = await axios.post<Job>(`${API_URL}/${id}/stop`);
  return response.data;
};

export const restartJob = async (id: string): Promise<Job> => {
  const response = await axios.post<Job>(`${API_URL}/${id}/restart`);
  return response.data;
};

export const deleteJob = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`);
}; 