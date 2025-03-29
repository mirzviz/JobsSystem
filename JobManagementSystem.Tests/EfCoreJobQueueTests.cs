using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using JobManagementSystem.Infrastructure.Data;
using JobManagementSystem.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace JobManagementSystem.Tests
{
    public class EfCoreJobQueueTests : IDisposable
    {
        private readonly JobManagementDbContext _dbContext;
        private readonly EfCoreJobQueue _jobQueue;
        private readonly WorkerNodeService _workerNodeService;
        private readonly Mock<ILogger<EfCoreJobQueue>> _loggerMock;

        public EfCoreJobQueueTests()
        {
            // Create in-memory database
            var options = new DbContextOptionsBuilder<JobManagementDbContext>()
                .UseInMemoryDatabase(databaseName: $"JobQueueTest_{Guid.NewGuid()}")
                .Options;
            _dbContext = new JobManagementDbContext(options);

            // Create mocks
            _loggerMock = new Mock<ILogger<EfCoreJobQueue>>();
            var sp = new Mock<IServiceProvider>().Object;
            var loggerWorker = new Mock<ILogger<WorkerNodeService>>().Object;
            _workerNodeService = new WorkerNodeService(sp, loggerWorker);

            // Create the job queue
            _jobQueue = new EfCoreJobQueue(_dbContext, _workerNodeService, _loggerMock.Object);
        }

        public void Dispose()
        {
            _dbContext.Database.EnsureDeleted();
            _dbContext.Dispose();
        }

        [Fact]
        public async Task EnqueueJobAsync_ShouldCreateNewJob()
        {
            // Arrange
            var jobName = "Test Job";
            var priority = JobPriority.High;

            // Act
            var job = await _jobQueue.EnqueueJobAsync(jobName, priority);

            // Assert
            Assert.NotNull(job);
            Assert.Equal(jobName, job.Name);
            Assert.Equal(priority, job.Priority);
            Assert.Equal(JobStatus.Pending, job.Status);
            Assert.Equal(0, job.Progress);
            Assert.NotEqual(Guid.Empty, job.Id);
        }

        [Fact]
        public async Task GetJobAsync_ShouldReturnExistingJob()
        {
            // Arrange
            var job = await _jobQueue.EnqueueJobAsync("Test Job", JobPriority.High);

            // Act
            var retrievedJob = await _jobQueue.GetJobAsync(job.Id);

            // Assert
            Assert.NotNull(retrievedJob);
            Assert.Equal(job.Id, retrievedJob.Id);
            Assert.Equal(job.Name, retrievedJob.Name);
        }

        [Fact]
        public async Task GetJobAsync_ShouldReturnNullForNonExistentJob()
        {
            // Act
            var job = await _jobQueue.GetJobAsync(Guid.NewGuid());

            // Assert
            Assert.Null(job);
        }

        [Fact]
        public async Task GetJobsAsync_ShouldFilterByStatus()
        {
            // Arrange
            await _jobQueue.EnqueueJobAsync("Job 1", JobPriority.High);
            await _jobQueue.EnqueueJobAsync("Job 2", JobPriority.Regular);
            var job3 = await _jobQueue.EnqueueJobAsync("Job 3", JobPriority.High);
            await _jobQueue.UpdateJobStatusAsync(job3.Id, JobStatus.Completed);

            // Act
            var completedJobs = await _jobQueue.GetJobsAsync(status: JobStatus.Completed);
            var pendingJobs = await _jobQueue.GetJobsAsync(status: JobStatus.Pending);

            // Assert
            Assert.Single(completedJobs);
            Assert.Equal(2, pendingJobs.Count());
        }

        [Fact]
        public async Task UpdateJobProgressAsync_ShouldUpdateProgress()
        {
            // Arrange
            var job = await _jobQueue.EnqueueJobAsync("Test Job", JobPriority.High);
            var newProgress = 50;

            // Act
            var updatedJob = await _jobQueue.UpdateJobProgressAsync(job.Id, newProgress);

            // Assert
            Assert.NotNull(updatedJob);
            Assert.Equal(newProgress, updatedJob.Progress);
        }

        [Fact]
        public async Task UpdateJobStatusAsync_ShouldUpdateStatusAndTimestamps()
        {
            // Arrange
            var job = await _jobQueue.EnqueueJobAsync("Test Job", JobPriority.High);

            // Act
            var runningJob = await _jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Running);
            var completedJob = await _jobQueue.UpdateJobStatusAsync(job.Id, JobStatus.Completed);

            // Assert
            Assert.NotNull(runningJob);
            Assert.NotNull(completedJob);
            Assert.Equal(JobStatus.Completed, completedJob.Status);
            Assert.NotNull(runningJob.StartedAt);
            Assert.NotNull(completedJob.CompletedAt);
        }

        [Fact]
        public async Task DeleteJobAsync_ShouldRemoveJob()
        {
            // Arrange
            var job = await _jobQueue.EnqueueJobAsync("Test Job", JobPriority.High);

            // Act
            var result = await _jobQueue.DeleteJobAsync(job.Id);
            var deletedJob = await _jobQueue.GetJobAsync(job.Id);

            // Assert
            Assert.True(result);
            Assert.Null(deletedJob);
        }

        [Fact]
        public async Task ClaimJobsAsync_ShouldClaimAvailableJobs()
        {
            // Arrange
            await _jobQueue.EnqueueJobAsync("Job 1", JobPriority.High);
            await _jobQueue.EnqueueJobAsync("Job 2", JobPriority.Regular);
            await _jobQueue.EnqueueJobAsync("Job 3", JobPriority.High);

            // Act
            var claimedJobs = await _jobQueue.ClaimJobsAsync(2);

            // Assert
            Assert.Equal(2, claimedJobs.Count());
            Assert.All(claimedJobs, job => 
            {
                Assert.Equal(JobStatus.Running, job.Status);
                Assert.Equal(_workerNodeService.NodeId, job.WorkerNodeId);
            });
        }

        [Fact]
        public async Task ClaimJobsAsync_ShouldRespectPriority()
        {
            // Arrange
            await _jobQueue.EnqueueJobAsync("Regular Job", JobPriority.Regular);
            await _jobQueue.EnqueueJobAsync("High Priority Job", JobPriority.High);
            await _jobQueue.EnqueueJobAsync("Another Regular Job", JobPriority.Regular);

            // Act
            var claimedJobs = await _jobQueue.ClaimJobsAsync(2);

            // Assert
            Assert.Equal(2, claimedJobs.Count());
            Assert.Equal(JobPriority.High, claimedJobs.First().Priority);
        }
    }
} 