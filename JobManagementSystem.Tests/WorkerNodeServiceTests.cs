using System;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
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
    public class WorkerNodeServiceTests : IDisposable
    {
        private readonly JobManagementDbContext _dbContext;
        private readonly WorkerNodeService _workerNodeService;
        private readonly Mock<ILogger<WorkerNodeService>> _loggerMock;
        private readonly Mock<IServiceProvider> _serviceProviderMock;
        private readonly Mock<IServiceScope> _serviceScopeMock;

        public WorkerNodeServiceTests()
        {
            // Create in-memory database
            var options = new DbContextOptionsBuilder<JobManagementDbContext>()
                .UseInMemoryDatabase(databaseName: $"WorkerNodeTest_{Guid.NewGuid()}")
                .Options;
            _dbContext = new JobManagementDbContext(options);

            // Create mocks
            _loggerMock = new Mock<ILogger<WorkerNodeService>>();
            _serviceProviderMock = new Mock<IServiceProvider>();
            _serviceScopeMock = new Mock<IServiceScope>();

            // Setup service provider mock
            _serviceScopeMock.Setup(x => x.ServiceProvider).Returns(_serviceProviderMock.Object);
            _serviceProviderMock.Setup(x => x.CreateScope()).Returns(_serviceScopeMock.Object);

            // Setup DbContext mock
            _serviceProviderMock.Setup(x => x.GetService(typeof(JobManagementDbContext)))
                .Returns(_dbContext);

            // Create the worker node service
            _workerNodeService = new WorkerNodeService(_serviceProviderMock.Object, _loggerMock.Object);
        }

        public void Dispose()
        {
            _dbContext.Database.EnsureDeleted();
            _dbContext.Dispose();
        }

        [Fact]
        public void NodeId_ShouldBeUnique()
        {
            // Act
            var nodeId1 = _workerNodeService.NodeId;
            var nodeId2 = _workerNodeService.NodeId;

            // Assert
            Assert.NotEqual(Guid.Empty, nodeId1);
            Assert.Equal(nodeId1, nodeId2);
        }

        [Fact]
        public async Task StartAsync_ShouldCreateWorkerNode()
        {
            // Act
            await _workerNodeService.StartAsync(CancellationToken.None);

            // Assert
            var node = await _dbContext.WorkerNodes.FindAsync(_workerNodeService.NodeId);
            Assert.NotNull(node);
            Assert.Equal(_workerNodeService.NodeId, node.Id);
            Assert.Equal(WorkerStatus.Available, node.Status);
            Assert.True(node.IsActive);
            Assert.False(node.IsProcessingJob);
        }

        [Fact]
        public async Task StopAsync_ShouldUpdateWorkerNodeStatus()
        {
            // Arrange
            await _workerNodeService.StartAsync(CancellationToken.None);

            // Act
            await _workerNodeService.StopAsync(CancellationToken.None);

            // Assert
            var node = await _dbContext.WorkerNodes.FindAsync(_workerNodeService.NodeId);
            Assert.NotNull(node);
            Assert.Equal(WorkerStatus.Offline, node.Status);
            Assert.False(node.IsActive);
        }

        [Fact]
        public async Task ExecuteAsync_ShouldUpdateHeartbeat()
        {
            // Arrange
            var cts = new CancellationTokenSource();
            var executeMethod = typeof(WorkerNodeService).GetMethod("ExecuteAsync", 
                BindingFlags.NonPublic | BindingFlags.Instance)
                ?? throw new InvalidOperationException("ExecuteAsync method not found");

            // Act
            var task = (Task)executeMethod.Invoke(_workerNodeService, new object[] { cts.Token });
            await Task.Delay(100); // Give some time for processing
            cts.Cancel();

            // Assert
            await task;
            var node = await _dbContext.WorkerNodes.FindAsync(_workerNodeService.NodeId);
            Assert.NotNull(node);
            Assert.True(node.LastHeartbeat > DateTime.UtcNow.AddSeconds(-1));
        }
    }
} 