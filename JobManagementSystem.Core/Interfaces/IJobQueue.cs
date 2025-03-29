using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using JobManagementSystem.Core.Models;

namespace JobManagementSystem.Core.Interfaces
{
    public interface IJobQueue
    {
        Task<Job> EnqueueJobAsync(string name, JobPriority priority, DateTime? scheduledStartTime = null);
        Task<Job?> GetJobAsync(Guid jobId);
        Task<IEnumerable<Job>> GetJobsAsync(JobStatus? status = null, JobPriority? priority = null);
        Task<Job?> UpdateJobProgressAsync(Guid jobId, int progress);
        Task<Job?> UpdateJobStatusAsync(Guid jobId, JobStatus status, string? errorMessage = null);
        Task<bool> DeleteJobAsync(Guid jobId);
        Task<Job?> StopJobAsync(Guid jobId);
        Task<Job?> RestartJobAsync(Guid jobId);
        Task<IEnumerable<Job>> ClaimJobsAsync(int maxJobs);
    }
} 