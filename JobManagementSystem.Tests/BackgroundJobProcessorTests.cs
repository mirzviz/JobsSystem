using System;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using JobManagementSystem.Infrastructure.Data;
using JobManagementSystem.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace JobManagementSystem.Tests
{
    public class BackgroundJobProcessorTests : IDisposable
    {
        private readonly JobManagementDbContext _dbContext;
        private readonly BackgroundJobProcessor _processor;
        private readonly WorkerNodeService _workerNodeService;
        private readonly Mock<ILogger<BackgroundJobProcessor>> _loggerMock;
        private readonly Mock<IServiceProvider> _serviceProviderMock;
        private readonly Mock<IServiceScope> _serviceScopeMock;
        private readonly Mock<IJobQueue> _jobQueueMock;

        public BackgroundJobProcessorTests()
        {
            // Create in-memory database
            var options = new DbContextOptionsBuilder<JobManagementDbContext>()
                .UseInMemoryDatabase(databaseName: $"JobProcessorTest_{Guid.NewGuid()}")
                .Options;
            _dbContext = new JobManagementDbContext(options);

            // Create mocks
            _loggerMock = new Mock<ILogger<BackgroundJobProcessor>>();
            _serviceProviderMock = new Mock<IServiceProvider>();
            _serviceScopeMock = new Mock<IServiceScope>();
            _jobQueueMock = new Mock<IJobQueue>();

            // Setup service provider mock
            _serviceScopeMock.Setup(x => x.ServiceProvider).Returns(_serviceProviderMock.Object);
            _serviceProviderMock.Setup(x => x.CreateScope()).Returns(_serviceScopeMock.Object);

            // Setup job queue mock
            _serviceProviderMock.Setup(x => x.GetService(typeof(IJobQueue)))
                .Returns(_jobQueueMock.Object);

            // Setup DbContext mock
            _serviceProviderMock.Setup(x => x.GetService(typeof(JobManagementDbContext)))
                .Returns(_dbContext);

            // Create worker node service
            var loggerWorker = new Mock<ILogger<WorkerNodeService>>().Object;
            _workerNodeService = new WorkerNodeService(_serviceProviderMock.Object, loggerWorker);

            // Create the processor
            _processor = new BackgroundJobProcessor(
                _loggerMock.Object,
                _serviceProviderMock.Object,
                _workerNodeService);
        }

        public void Dispose()
        {
            _dbContext.Database.EnsureDeleted();
            _dbContext.Dispose();
        }

        private Task InvokeExecuteAsync(BackgroundJobProcessor processor, CancellationToken token)
        {
            var executeMethod = typeof(BackgroundJobProcessor).GetMethod("ExecuteAsync", 
                BindingFlags.NonPublic | BindingFlags.Instance) 
                ?? throw new InvalidOperationException("ExecuteAsync method not found");
            return (Task)executeMethod.Invoke(processor, new object[] { token });
        }

        [Fact]
        public async Task ExecuteAsync_ShouldProcessJobs()
        {
            // Arrange
            var job = new Job
            {
                Id = Guid.NewGuid(),
                Name = "Test Job",
                Priority = JobPriority.High,
                Status = JobStatus.Pending
            };

            _jobQueueMock.Setup(x => x.ClaimJobsAsync(It.IsAny<int>()))
                .ReturnsAsync(new[] { job });

            var cts = new CancellationTokenSource();
            var task = InvokeExecuteAsync(_processor, cts.Token);

            // Act
            await Task.Delay(100); // Give some time for processing
            cts.Cancel();

            // Assert
            await task;
            _jobQueueMock.Verify(x => x.ClaimJobsAsync(It.IsAny<int>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task ExecuteAsync_ShouldHandleJobCompletion()
        {
            // Arrange
            var job = new Job
            {
                Id = Guid.NewGuid(),
                Name = "Test Job",
                Priority = JobPriority.High,
                Status = JobStatus.Pending
            };

            _jobQueueMock.Setup(x => x.ClaimJobsAsync(It.IsAny<int>()))
                .ReturnsAsync(new[] { job });

            var cts = new CancellationTokenSource();
            var task = InvokeExecuteAsync(_processor, cts.Token);

            // Act
            await Task.Delay(100); // Give some time for processing
            cts.Cancel();

            // Assert
            await task;
            _jobQueueMock.Verify(x => x.UpdateJobStatusAsync(job.Id, JobStatus.Completed, It.IsAny<string>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task ExecuteAsync_ShouldHandleJobFailure()
        {
            // Arrange
            var job = new Job
            {
                Id = Guid.NewGuid(),
                Name = "Test Job",
                Priority = JobPriority.High,
                Status = JobStatus.Pending
            };

            _jobQueueMock.Setup(x => x.ClaimJobsAsync(It.IsAny<int>()))
                .ReturnsAsync(new[] { job });
            _jobQueueMock.Setup(x => x.UpdateJobProgressAsync(job.Id, It.IsAny<int>()))
                .ThrowsAsync(new Exception("Test failure"));

            var cts = new CancellationTokenSource();
            var task = InvokeExecuteAsync(_processor, cts.Token);

            // Act
            await Task.Delay(100); // Give some time for processing
            cts.Cancel();

            // Assert
            await task;
            _jobQueueMock.Verify(x => x.UpdateJobStatusAsync(job.Id, JobStatus.Failed, It.IsAny<string>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task ExecuteAsync_ShouldHandleCancellation()
        {
            // Arrange
            var job = new Job
            {
                Id = Guid.NewGuid(),
                Name = "Test Job",
                Priority = JobPriority.High,
                Status = JobStatus.Pending
            };

            _jobQueueMock.Setup(x => x.ClaimJobsAsync(It.IsAny<int>()))
                .ReturnsAsync(new[] { job });

            var cts = new CancellationTokenSource();
            var task = InvokeExecuteAsync(_processor, cts.Token);

            // Act
            cts.Cancel();

            // Assert
            await task;
            _jobQueueMock.Verify(x => x.UpdateJobStatusAsync(job.Id, JobStatus.Stopped, It.IsAny<string>()), Times.AtLeastOnce);
        }
    }
} 