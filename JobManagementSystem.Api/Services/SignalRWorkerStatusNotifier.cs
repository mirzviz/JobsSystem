using System;
using System.Threading.Tasks;
using JobManagementSystem.Api.Hubs;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace JobManagementSystem.Api.Services
{
    public class SignalRWorkerStatusNotifier : IWorkerStatusNotifier
    {
        private readonly IHubContext<WorkerStatusHub> _hubContext;
        private readonly ILogger<SignalRWorkerStatusNotifier> _logger;

        public SignalRWorkerStatusNotifier(
            IHubContext<WorkerStatusHub> hubContext,
            ILogger<SignalRWorkerStatusNotifier> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task NotifyWorkerStatusAsync(WorkerStatusUpdate update)
        {
            try
            {
                await _hubContext.Clients.All.SendAsync("ReceiveWorkerStatus", update);
                _logger.LogDebug("Worker status update sent for worker {NodeId}: {Status}", update.NodeId, update.Status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send worker status update via SignalR");
            }
        }
    }
} 