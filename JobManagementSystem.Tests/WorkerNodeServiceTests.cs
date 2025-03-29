using System;
using JobManagementSystem.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace JobManagementSystem.Tests
{
    public class WorkerNodeServiceTests
    {
        [Fact]
        public void Constructor_ShouldNotThrowException()
        {
            // This test verifies that we can construct the class without exceptions
            
            // Act & Assert - verify construction doesn't throw
            try
            {
                // Create mocks with minimal setup
                var logger = new Mock<ILogger<WorkerNodeService>>().Object;
                var sp = new Mock<IServiceProvider>().Object;
                
                // Try to create the service
                var service = new WorkerNodeService(sp, logger);
                
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