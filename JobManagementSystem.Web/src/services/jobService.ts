import axios from 'axios';
import { Job, JobPriority, JobStatus } from '../types/Job';

console.log('Job service module loaded');

// Configure axios to log requests and responses
axios.interceptors.request.use(request => {
  console.log(`%c📤 API Request:`, 'background: #2196F3; color: white; padding: 2px 4px; border-radius: 2px;', {
    url: request.url,
    method: request.method,
    data: request.data
  });
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log(`%c📥 API Response:`, 'background: #4CAF50; color: white; padding: 2px 4px; border-radius: 2px;', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error(`%c❌ API Error:`, 'background: #F44336; color: white; padding: 2px 4px; border-radius: 2px;', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

const API_URL = '/api/jobs';

export interface CreateJobRequest {
  name: string;
  priority: JobPriority;
  scheduledStartTime?: Date;
}

export const getJobs = async (): Promise<Job[]> => {
  console.log('Fetching all jobs from API');
  const response = await axios.get<Job[]>(API_URL);
  return response.data;
};

export const getJob = async (id: string): Promise<Job> => {
  console.log(`Fetching job ${id} from API`);
  const response = await axios.get<Job>(`${API_URL}/${id}`);
  return response.data;
};

export const createJob = async (job: CreateJobRequest): Promise<Job> => {
  console.log('Creating new job:', job);
  const response = await axios.post<Job>(API_URL, job);
  return response.data;
};

export const updateJobProgress = async (id: string, progress: number): Promise<Job> => {
  console.log(`Updating job ${id} progress to ${progress}%`);
  const response = await axios.put<Job>(`${API_URL}/${id}/progress`, progress);
  return response.data;
};

export const updateJobStatus = async (id: string, status: JobStatus): Promise<Job> => {
  console.log(`Updating job ${id} status to ${status}`);
  const response = await axios.put<Job>(`${API_URL}/${id}/status`, status);
  return response.data;
};

export const stopJob = async (id: string): Promise<Job> => {
  console.log(`Stopping job ${id}`);
  const response = await axios.post<Job>(`${API_URL}/${id}/stop`);
  return response.data;
};

export const restartJob = async (id: string): Promise<Job> => {
  console.log(`Restarting job ${id}`);
  const response = await axios.post<Job>(`${API_URL}/${id}/restart`);
  return response.data;
};

export const deleteJob = async (id: string): Promise<void> => {
  console.log(`Deleting job ${id}`);
  await axios.delete(`${API_URL}/${id}`);
}; 