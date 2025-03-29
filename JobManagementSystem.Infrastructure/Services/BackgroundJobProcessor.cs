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
    private readonly TimeSpan _jobPollingInterval = TimeSpan.FromSeconds(5);
    private Job? _currentJob;

    public BackgroundJobProcessor(
        ILogger<BackgroundJobProcessor> logger,
        IServiceProvider serviceProvider,
        WorkerNodeService workerNodeService)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _workerNodeService = workerNodeService;
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
                            _currentJob = null;
                            return;
                        }

                        await jobQueue.UpdateJobProgressAsync(job.Id, progress);
                        _logger.LogInformation("Job {JobId} progress: {Progress}%", job.Id, progress);
                        await Task.Delay(1000, stoppingToken); // Simulate work being done
                    }

                    await jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Completed);
                    _logger.LogInformation("Job {JobId} completed successfully", job.Id);
                }
                catch (OperationCanceledException)
                {
                    // Job was canceled
                    await jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Stopped);
                    _logger.LogInformation("Job {JobId} was cancelled", job.Id);
                }
                catch (Exception ex)
                {
                    // Job failed
                    await jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Failed, ex.Message);
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
} 