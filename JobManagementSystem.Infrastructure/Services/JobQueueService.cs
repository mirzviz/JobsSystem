using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using JobManagementSystem.Infrastructure.Data;

namespace JobManagementSystem.Infrastructure.Services
{
    public class JobQueueService : IJobQueue
    {
        private readonly JobManagementDbContext _context;

        public JobQueueService(JobManagementDbContext context)
        {
            _context = context;
        }

        public async Task<Job> EnqueueJobAsync(string name, JobPriority priority, DateTime? scheduledStartTime = null)
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

            _context.Jobs.Add(job);
            await _context.SaveChangesAsync();
            return job;
        }

        public async Task<Job?> GetJobAsync(Guid jobId)
        {
            return await _context.Jobs.FindAsync(jobId);
        }

        public async Task<IEnumerable<Job>> GetJobsAsync(JobStatus? status = null, JobPriority? priority = null)
        {
            var query = _context.Jobs.AsQueryable();

            if (status.HasValue)
                query = query.Where(j => j.Status == status.Value);

            if (priority.HasValue)
                query = query.Where(j => j.Priority == priority.Value);

            return await query.OrderByDescending(j => j.Priority)
                            .ThenBy(j => j.StartTime)
                            .ToListAsync();
        }

        public async Task<Job?> UpdateJobProgressAsync(Guid jobId, int progress)
        {
            var job = await _context.Jobs.FindAsync(jobId);
            if (job == null) return null;

            job.Progress = progress;
            if (progress >= 100)
            {
                job.Status = JobStatus.Completed;
                job.EndTime = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return job;
        }

        public async Task<Job?> UpdateJobStatusAsync(Guid jobId, JobStatus status, string? errorMessage = null)
        {
            var job = await _context.Jobs.FindAsync(jobId);
            if (job == null) return null;

            job.Status = status;
            job.ErrorMessage = errorMessage;

            if (status == JobStatus.Completed || status == JobStatus.Failed)
                job.EndTime = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return job;
        }

        public async Task<bool> DeleteJobAsync(Guid jobId)
        {
            var job = await _context.Jobs.FindAsync(jobId);
            if (job == null) return false;

            _context.Jobs.Remove(job);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Job?> StopJobAsync(Guid jobId)
        {
            return await UpdateJobStatusAsync(jobId, JobStatus.Stopped);
        }

        public async Task<Job?> RestartJobAsync(Guid jobId)
        {
            var job = await _context.Jobs.FindAsync(jobId);
            if (job == null) return null;

            job.Status = JobStatus.Pending;
            job.Progress = 0;
            job.ErrorMessage = null;
            job.RetryCount++;
            job.StartTime = DateTime.UtcNow;
            job.EndTime = null;

            await _context.SaveChangesAsync();
            return job;
        }
    }
} 