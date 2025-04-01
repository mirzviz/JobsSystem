using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Data;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using JobManagementSystem.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Data.SqlClient;

namespace JobManagementSystem.Infrastructure.Services;

public class EfCoreJobQueue : IJobQueue
{
    private readonly JobManagementDbContext _dbContext;
    private readonly WorkerNodeService _workerNodeService;
    private readonly ILogger<EfCoreJobQueue> _logger;

    public EfCoreJobQueue(
        JobManagementDbContext dbContext,
        WorkerNodeService workerNodeService,
        ILogger<EfCoreJobQueue> logger)
    {
        _dbContext = dbContext;
        _workerNodeService = workerNodeService;
        _logger = logger;
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
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Jobs.Add(job);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Job {JobId} with name {JobName} enqueued", job.Id, job.Name);
        return job;
    }

    public async Task<Job?> GetJobAsync(Guid jobId)
    {
        return await _dbContext.Jobs.FindAsync(jobId);
    }

    public async Task<IEnumerable<Job>> GetJobsAsync(JobStatus? status = null, JobPriority? priority = null)
    {
        IQueryable<Job> query = _dbContext.Jobs;

        if (status.HasValue)
        {
            query = query.Where(j => j.Status == status.Value);
        }

        if (priority.HasValue)
        {
            query = query.Where(j => j.Priority == priority.Value);
        }

        return await query.ToListAsync();
    }

    public async Task<Job?> UpdateJobProgressAsync(Guid jobId, int progress)
    {
        var job = await _dbContext.Jobs.FindAsync(jobId);
        if (job == null)
        {
            return null;
        }

        job.Progress = progress;
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Job {JobId} progress updated to {Progress}%", jobId, progress);
        return job;
    }

    public async Task<Job?> UpdateJobStatusAsync(Guid jobId, JobStatus status, string? errorMessage = null)
    {
        var job = await _dbContext.Jobs.FindAsync(jobId);
        if (job == null)
        {
            return null;
        }

        job.Status = status;
        
        if (status == JobStatus.Running && job.StartedAt == null)
        {
            job.StartedAt = DateTime.UtcNow;
        }
        else if ((status == JobStatus.Completed || status == JobStatus.Failed) && job.CompletedAt == null)
        {
            job.CompletedAt = DateTime.UtcNow;
        }

        if (errorMessage != null)
        {
            job.ErrorMessage = errorMessage;
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Job {JobId} status updated to {Status}", jobId, status);
        return job;
    }

    public async Task<bool> DeleteJobAsync(Guid jobId)
    {
        var job = await _dbContext.Jobs.FindAsync(jobId);
        if (job == null)
        {
            return false;
        }

        _dbContext.Jobs.Remove(job);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Job {JobId} deleted", jobId);
        return true;
    }

    public async Task<Job?> StopJobAsync(Guid jobId)
    {
        return await UpdateJobStatusAsync(jobId, JobStatus.Stopped);
    }

    public async Task<Job?> RestartJobAsync(Guid jobId)
    {
        var job = await _dbContext.Jobs.FindAsync(jobId);
        if (job == null)
        {
            return null;
        }

        job.Status = JobStatus.Pending;
        job.Progress = 0;
        job.WorkerNodeId = null;
        job.LastClaimTime = null;
        job.ErrorMessage = null;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Job {JobId} restarted", jobId);
        return job;
    }

    public async Task<IEnumerable<Job>> ClaimJobsAsync(int maxJobs)
    {
        var currentNodeId = _workerNodeService.NodeId;

        try
        {
            // Use raw SQL to avoid race conditions when multiple workers try to claim jobs
            var sql = @"
                UPDATE Jobs 
                SET WorkerNodeId = @nodeId, 
                    Status = @runningStatus, 
                    LastClaimTime = @now, 
                    StartedAt = @now 
                OUTPUT INSERTED.*
                FROM Jobs j
                INNER JOIN (
                    SELECT TOP (@limit) Id 
                    FROM Jobs 
                    WHERE (WorkerNodeId IS NULL OR LastClaimTime < @staleClaimTime) 
                      AND Status = @pendingStatus 
                    ORDER BY 
                      CASE WHEN Priority = 1 THEN 0 ELSE 1 END, -- High priority first
                      CreatedAt ASC
                ) AS subquery ON j.Id = subquery.Id
            ";

            // Handle stale claims (jobs claimed by workers that died)
            var staleClaimTime = DateTime.UtcNow.AddMinutes(-2);
            var now = DateTime.UtcNow;

            // Create parameters for SQL Server with explicit types
            var parameters = new[]
            {
                new SqlParameter("@nodeId", SqlDbType.UniqueIdentifier) { Value = currentNodeId },
                new SqlParameter("@runningStatus", SqlDbType.Int) { Value = (int)JobStatus.Running },
                new SqlParameter("@now", SqlDbType.DateTime2) { Value = now },
                new SqlParameter("@staleClaimTime", SqlDbType.DateTime2) { Value = staleClaimTime },
                new SqlParameter("@pendingStatus", SqlDbType.Int) { Value = (int)JobStatus.Pending },
                new SqlParameter("@limit", SqlDbType.Int) { Value = maxJobs }
            };

            // Execute raw SQL and get the claimed jobs
            var jobs = await _dbContext.Jobs
                .FromSqlRaw(sql, parameters)
                .ToListAsync();

            foreach (var job in jobs)
            {
                _logger.LogInformation("Job {JobId} claimed by worker {WorkerId}", job.Id, currentNodeId);
            }

            return jobs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error claiming jobs: {Message}", ex.Message);
            return new List<Job>();
        }
    }
} 