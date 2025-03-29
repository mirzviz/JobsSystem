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
    public class EfCoreJobQueueTests
    {
        [Fact]
        public void Constructor_ShouldNotThrowException()
        {
            // This test verifies that we can construct the class without exceptions
            
            // Arrange
            var logger = new Mock<ILogger<EfCoreJobQueue>>().Object;
            
            // Act & Assert - verify construction doesn't throw
            try
            {
                // Create a real DbContext with in-memory database
                var options = new DbContextOptionsBuilder<JobManagementDbContext>()
                    .UseInMemoryDatabase(databaseName: "TestJobQueue")
                    .Options;
                
                var dbContext = new JobManagementDbContext(options);
                
                var sp = new Mock<IServiceProvider>().Object;
                var loggerWorker = new Mock<ILogger<WorkerNodeService>>().Object;
                
                // Use a try-catch instead of Record.Exception to be more resilient
                var workerService = new WorkerNodeService(sp, loggerWorker);
                var jobQueue = new EfCoreJobQueue(dbContext, workerService, logger);
                
                // If we got here, the test passed
                Assert.True(true);
            }
            catch (Exception ex)
            {
                // We shouldn't get here, but if we do, fail with a clear message
                Assert.Fail($"Exception was thrown: {ex.Message}");
            }
        }
    }
} 