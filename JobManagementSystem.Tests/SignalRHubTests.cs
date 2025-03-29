using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using JobManagementSystem.Api.Hubs;
using JobManagementSystem.Core.Models;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;

namespace JobManagementSystem.Tests
{
    public class SignalRHubTests
    {
        [Fact]
        public async Task JobProgressHub_SendJobProgressUpdate_ShouldSendToAllClients()
        {
            // Arrange
            var mockClients = new Mock<IHubClients>();
            var mockClientProxy = new Mock<IClientProxy>();

            mockClients
                .Setup(clients => clients.All)
                .Returns(mockClientProxy.Object);

            var hubContext = new Mock<IHubContext<JobProgressHub>>();
            hubContext
                .Setup(context => context.Clients)
                .Returns(mockClients.Object);

            var hub = new JobProgressHub(hubContext.Object);

            var jobProgressUpdate = new JobProgressUpdate
            {
                JobId = 1,
                Progress = 75,
                Status = JobStatus.Running
            };

            // Act
            await hub.SendJobProgressUpdate(jobProgressUpdate);

            // Assert
            mockClientProxy.Verify(
                clientProxy => clientProxy.SendCoreAsync(
                    "ReceiveJobProgress",
                    It.Is<object[]>(objects => objects.Length == 1 && (objects[0] as JobProgressUpdate) == jobProgressUpdate),
                    default),
                Times.Once);
        }

        [Fact]
        public async Task WorkerStatusHub_SendWorkerStatusUpdate_ShouldSendToAllClients()
        {
            // Arrange
            var mockClients = new Mock<IHubClients>();
            var mockClientProxy = new Mock<IClientProxy>();

            mockClients
                .Setup(clients => clients.All)
                .Returns(mockClientProxy.Object);

            var hubContext = new Mock<IHubContext<WorkerStatusHub>>();
            hubContext
                .Setup(context => context.Clients)
                .Returns(mockClients.Object);

            var hub = new WorkerStatusHub(hubContext.Object);

            var workerStatusUpdate = new WorkerStatusUpdate
            {
                NodeId = Guid.NewGuid(),
                Status = WorkerStatus.Busy,
                Name = "TestWorker"
            };

            // Act
            await hub.SendWorkerStatusUpdate(workerStatusUpdate);

            // Assert
            mockClientProxy.Verify(
                clientProxy => clientProxy.SendCoreAsync(
                    "ReceiveWorkerStatus",
                    It.Is<object[]>(objects => objects.Length == 1 && (objects[0] as WorkerStatusUpdate) == workerStatusUpdate),
                    default),
                Times.Once);
        }
    }
} 