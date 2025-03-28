using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;

namespace JobManagementSystem.Infrastructure.Services
{
    public class BackgroundJobProcessor : BackgroundService
    {
        private readonly IJobQueue _jobQueue;
        private readonly ILogger<BackgroundJobProcessor> _logger;
        private readonly SemaphoreSlim _semaphore;
        private readonly ConcurrentDictionary<Guid, Task> _runningJobs;
        private readonly int _maxConcurrentJobs;

        public BackgroundJobProcessor(
            IJobQueue jobQueue,
            ILogger<BackgroundJobProcessor> logger,
            int maxConcurrentJobs = 3)
        {
            _jobQueue = jobQueue;
            _logger = logger;
            _maxConcurrentJobs = maxConcurrentJobs;
            _semaphore = new SemaphoreSlim(maxConcurrentJobs);
            _runningJobs = new ConcurrentDictionary<Guid, Task>();
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Get all pending jobs
                    var pendingJobs = await _jobQueue.GetJobsAsync(JobStatus.Pending);
                    
                    // Process high priority jobs first
                    foreach (var job in pendingJobs.OrderByDescending(j => j.Priority))
                    {
                        if (stoppingToken.IsCancellationRequested)
                            break;

                        // Wait for a slot to become available
                        await _semaphore.WaitAsync(stoppingToken);

                        // Start processing the job
                        var jobTask = ProcessJobAsync(job, stoppingToken);
                        _runningJobs.TryAdd(job.Id, jobTask);

                        // Fire and forget, but log any errors
                        _ = jobTask.ContinueWith(
                            async t => 
                            {
                                _semaphore.Release();
                                _runningJobs.TryRemove(job.Id, out _);
                                
                                if (t.IsFaulted && t.Exception != null)
                                {
                                    _logger.LogError(t.Exception, "Job {JobId} failed with error", job.Id);
                                    await _jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Failed, t.Exception.Message);
                                }
                            },
                            TaskContinuationOptions.ExecuteSynchronously);
                    }

                    // Wait a bit before checking for new jobs
                    await Task.Delay(1000, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in background job processor");
                    await Task.Delay(5000, stoppingToken); // Wait longer on error
                }
            }
        }

        private async Task ProcessJobAsync(Job job, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Starting job {JobId}", job.Id);
                await _jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Running);

                // Simulate work with progress updates
                for (int progress = 0; progress <= 100; progress += 10)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    // Simulate some work
                    await Task.Delay(1000, cancellationToken);
                    await _jobQueue.UpdateJobProgressAsync(job.Id, progress);
                    
                    _logger.LogInformation("Job {JobId} progress: {Progress}%", job.Id, progress);
                }

                await _jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Completed);
                _logger.LogInformation("Job {JobId} completed successfully", job.Id);
            }
            catch (OperationCanceledException)
            {
                await _jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Stopped);
                _logger.LogInformation("Job {JobId} was cancelled", job.Id);
                throw;
            }
            catch (Exception ex)
            {
                await _jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Failed, ex.Message);
                _logger.LogError(ex, "Job {JobId} failed", job.Id);
                throw;
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Stopping background job processor");
            
            // Wait for all running jobs to complete
            var runningTasks = _runningJobs.Values.ToList();
            await Task.WhenAll(runningTasks);
            
            await base.StopAsync(cancellationToken);
        }
    }
} 