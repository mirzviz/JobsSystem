using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;

namespace JobManagementSystem.Infrastructure.Services
{
    public class InMemoryJobQueue : IJobQueue
    {
        private readonly ConcurrentDictionary<Guid, Job> _jobs = new();

        public Task<Job> EnqueueJobAsync(string name, JobPriority priority, DateTime? scheduledStartTime = null)
        {
            var job = new Job
            {
                Id = Guid.NewGuid(),
                Name = name,
                Priority = priority,
                Status = JobStatus.Pending,
                Progress = 0,
                CreatedAt = DateTime.UtcNow,
                StartTime = scheduledStartTime ?? DateTime.UtcNow,
                RetryCount = 0
            };

            _jobs.TryAdd(job.Id, job);
            return Task.FromResult(job);
        }

        public Task<Job?> GetJobAsync(Guid jobId)
        {
            return _jobs.TryGetValue(jobId, out var job) 
                ? Task.FromResult<Job?>(job) 
                : Task.FromResult<Job?>(null);
        }

        public Task<IEnumerable<Job>> GetJobsAsync(JobStatus? status = null, JobPriority? priority = null)
        {
            var query = _jobs.Values.AsEnumerable();

            if (status.HasValue)
                query = query.Where(j => j.Status == status.Value);

            if (priority.HasValue)
                query = query.Where(j => j.Priority == priority.Value);

            var result = query.OrderByDescending(j => j.Priority)
                            .ThenBy(j => j.StartTime)
                            .ToList();

            return Task.FromResult<IEnumerable<Job>>(result);
        }

        public Task<Job?> UpdateJobProgressAsync(Guid jobId, int progress)
        {
            if (_jobs.TryGetValue(jobId, out var job))
            {
                job.Progress = progress;
                if (progress >= 100)
                {
                    job.Status = JobStatus.Completed;
                    job.EndTime = DateTime.UtcNow;
                }
                return Task.FromResult<Job?>(job);
            }
            return Task.FromResult<Job?>(null);
        }

        public Task<Job?> UpdateJobStatusAsync(Guid jobId, JobStatus status, string? errorMessage = null)
        {
            if (_jobs.TryGetValue(jobId, out var job))
            {
                job.Status = status;
                job.ErrorMessage = errorMessage;

                if (status == JobStatus.Completed || status == JobStatus.Failed)
                    job.EndTime = DateTime.UtcNow;

                return Task.FromResult<Job?>(job);
            }
            return Task.FromResult<Job?>(null);
        }

        public Task<bool> DeleteJobAsync(Guid jobId)
        {
            return Task.FromResult(_jobs.TryRemove(jobId, out _));
        }

        public Task<Job?> StopJobAsync(Guid jobId)
        {
            return UpdateJobStatusAsync(jobId, JobStatus.Stopped);
        }

        public Task<Job?> RestartJobAsync(Guid jobId)
        {
            if (_jobs.TryGetValue(jobId, out var job))
            {
                job.Status = JobStatus.Pending;
                job.Progress = 0;
                job.ErrorMessage = null;
                job.RetryCount++;
                job.StartTime = DateTime.UtcNow;
                job.EndTime = null;
                return Task.FromResult<Job?>(job);
            }
            return Task.FromResult<Job?>(null);
        }
    }
} 