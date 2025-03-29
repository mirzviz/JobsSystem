import * as signalR from '@microsoft/signalr';
import { JobStatus } from '../types/Job';

export interface JobProgressUpdate {
  jobId: string;
  progress: number;
  status: JobStatus;
}

let connection: signalR.HubConnection | null = null;

export const startConnection = (onJobUpdate: (update: JobProgressUpdate) => void): Promise<void> => {
  connection = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/jobProgress')
    .withAutomaticReconnect()
    .build();

  connection.on('ReceiveJobProgress', (update: JobProgressUpdate) => {
    onJobUpdate(update);
  });

  return connection.start();
};

export const stopConnection = async (): Promise<void> => {
  if (connection) {
    await connection.stop();
    connection = null;
  }
}; 