using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;

namespace JobManagementSystem.Infrastructure.Services
{
    public class WorkerNodeService : IWorkerNode
    {
        private readonly IJobQueue _jobQueue;
        private readonly ConcurrentDictionary<Guid, Task> _runningJobs;
        private WorkerStatus _status;

        public string NodeId { get; }
        public WorkerStatus Status => _status;

        public WorkerNodeService(IJobQueue jobQueue)
        {
            NodeId = Guid.NewGuid().ToString();
            _jobQueue = jobQueue;
            _runningJobs = new ConcurrentDictionary<Guid, Task>();
            _status = WorkerStatus.Idle;
        }

        public async Task<bool> StartJobAsync(Job job)
        {
            if (_status != WorkerStatus.Idle)
                return false;

            var jobTask = Task.Run(async () =>
            {
                try
                {
                    await _jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Running);
                    _status = WorkerStatus.Active;

                    // Simulate job execution with progress updates
                    for (int progress = 0; progress <= 100; progress += 10)
                    {
                        if (_status != WorkerStatus.Active)
                            break;

                        await _jobQueue.UpdateJobProgressAsync(job.Id, progress);
                        await Task.Delay(1000); // Simulate work
                    }

                    if (_status == WorkerStatus.Active)
                        await _jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Completed);
                }
                catch (Exception ex)
                {
                    await _jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Failed, ex.Message);
                }
                finally
                {
                    _runningJobs.TryRemove(job.Id, out _);
                    if (_runningJobs.IsEmpty)
                        _status = WorkerStatus.Idle;
                }
            });

            return _runningJobs.TryAdd(job.Id, jobTask);
        }

        public async Task<bool> StopJobAsync(Guid jobId)
        {
            if (_runningJobs.TryGetValue(jobId, out var task))
            {
                await _jobQueue.UpdateJobStatusAsync(jobId, JobStatus.Stopped);
                return true;
            }
            return false;
        }

        public Task UpdateStatusAsync(WorkerStatus status)
        {
            _status = status;
            return Task.CompletedTask;
        }
    }
} 