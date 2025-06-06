using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using JobManagementSystem.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JobManagementSystem.Infrastructure.Services;

public class BackgroundJobProcessor : BackgroundService
{
    private readonly ILogger<BackgroundJobProcessor> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly WorkerNodeService _workerNodeService;
    private readonly IJobProgressNotifier? _jobProgressNotifier;
    private readonly TimeSpan _jobPollingInterval = TimeSpan.FromSeconds(5);
    private Job? _currentJob;

    public BackgroundJobProcessor(
        ILogger<BackgroundJobProcessor> logger,
        IServiceProvider serviceProvider,
        WorkerNodeService workerNodeService,
        IJobProgressNotifier? jobProgressNotifier = null)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _workerNodeService = workerNodeService;
        _jobProgressNotifier = jobProgressNotifier;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background job processor starting...");

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    if (_currentJob == null)
                    {
                        // Only look for a new job if we're not processing one already
                        await ClaimAndProcessNextJobAsync(stoppingToken);
                    }
                    else
                    {
                        // We're already processing a job, wait for the next polling interval
                        await Task.Delay(_jobPollingInterval, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in background job processor");
                    await Task.Delay(_jobPollingInterval, stoppingToken);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Shutdown requested
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in background job processor");
        }
        finally
        {
            _logger.LogInformation("Stopping background job processor");
            
            // If we're processing a job during shutdown, mark it as stopped
            if (_currentJob != null)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var jobQueue = scope.ServiceProvider.GetRequiredService<IJobQueue>();
                    await jobQueue.UpdateJobStatusAsync(_currentJob.Id, JobStatus.Stopped, "Worker shutdown");
                    await SendJobProgressUpdateAsync(GetJobId(_currentJob.Id), 0, JobStatus.Stopped, "Worker shutdown");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error stopping job during shutdown");
                }
            }
        }
    }

    private async Task ClaimAndProcessNextJobAsync(CancellationToken stoppingToken)
    {
        try
        {
            // Claim a single job from the database
            using var scope = _serviceProvider.CreateScope();
            var jobQueue = scope.ServiceProvider.GetRequiredService<IJobQueue>();
            var dbContext = scope.ServiceProvider.GetRequiredService<JobManagementDbContext>();
            var jobs = await jobQueue.ClaimJobsAsync(1);

            // If we found a job to process
            if (jobs.Any())
            {
                var job = jobs.First();
                _currentJob = job;
                
                _logger.LogInformation("Starting job {JobId}", job.Id);

                // Send initial progress update
                await SendJobProgressUpdateAsync(GetJobId(job.Id), 0, JobStatus.Running, "Starting job");

                // Update worker node status to indicate it's processing a job
                try
                {
                    var node = await dbContext.WorkerNodes.FindAsync(_workerNodeService.NodeId);
                    if (node != null)
                    {
                        node.IsProcessingJob = true;
                        node.CurrentJobId = job.Id;
                        node.Status = WorkerStatus.Busy;
                        await dbContext.SaveChangesAsync();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to update worker node status at job start");
                }

                try
                {
                    // Simulate job execution with progress updates
                    for (int progress = 0; progress <= 100; progress += 10)
                    {
                        if (stoppingToken.IsCancellationRequested)
                        {
                            await jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Stopped);
                            await SendJobProgressUpdateAsync(GetJobId(job.Id), progress, JobStatus.Stopped, "Job stopped due to shutdown");
                            _currentJob = null;
                            return;
                        }

                        await jobQueue.UpdateJobProgressAsync(job.Id, progress);
                        await SendJobProgressUpdateAsync(GetJobId(job.Id), progress, JobStatus.Running);
                        _logger.LogInformation("Job {JobId} progress: {Progress}%", job.Id, progress);
                        await Task.Delay(1000, stoppingToken); // Simulate work being done
                    }

                    await jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Completed);
                    await SendJobProgressUpdateAsync(GetJobId(job.Id), 100, JobStatus.Completed, "Job completed successfully");
                    _logger.LogInformation("Job {JobId} completed successfully", job.Id);
                }
                catch (OperationCanceledException)
                {
                    // Job was canceled
                    await jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Stopped);
                    await SendJobProgressUpdateAsync(GetJobId(job.Id), 0, JobStatus.Stopped, "Job was canceled");
                    _logger.LogInformation("Job {JobId} was cancelled", job.Id);
                }
                catch (Exception ex)
                {
                    // Job failed
                    await jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Failed, ex.Message);
                    await SendJobProgressUpdateAsync(GetJobId(job.Id), 0, JobStatus.Failed, ex.Message);
                    _logger.LogError(ex, "Job {JobId} failed", job.Id);
                }
                finally
                {
                    _currentJob = null;

                    // Update worker node status
                    try
                    {
                        var node = await dbContext.WorkerNodes.FindAsync(_workerNodeService.NodeId);
                        if (node != null)
                        {
                            node.IsProcessingJob = false;
                            node.CurrentJobId = null;
                            node.Status = WorkerStatus.Available;
                            await dbContext.SaveChangesAsync();
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to update worker node status");
                    }
                }
            }
            else
            {
                // No job found, wait before checking again
                await Task.Delay(_jobPollingInterval, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Gracefully handle cancellation during shutdown
            _logger.LogInformation("Job processing canceled due to application shutdown");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing job");
        }
    }

    private string GetJobId(Guid jobId)
    {
        // Return the string representation of the GUID
        return jobId.ToString();
    }

    private async Task SendJobProgressUpdateAsync(string jobId, int progress, JobStatus status, string? statusMessage = null)
    {
        if (_jobProgressNotifier == null)
        {
            return;
        }

        try
        {
            var update = new JobProgressUpdate
            {
                JobId = jobId,
                Progress = progress,
                Status = status,
                StatusMessage = statusMessage,
                Timestamp = DateTime.UtcNow
            };

            await _jobProgressNotifier.NotifyJobProgressAsync(update);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send job progress update");
        }
    }
} 