using System;
using System.Threading.Tasks;
using JobManagementSystem.Api.Hubs;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace JobManagementSystem.Api.Services
{
    public class SignalRJobProgressNotifier : IJobProgressNotifier
    {
        private readonly IHubContext<JobProgressHub> _hubContext;
        private readonly ILogger<SignalRJobProgressNotifier> _logger;

        public SignalRJobProgressNotifier(
            IHubContext<JobProgressHub> hubContext,
            ILogger<SignalRJobProgressNotifier> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task NotifyJobProgressAsync(JobProgressUpdate update)
        {
            try
            {
                await _hubContext.Clients.All.SendAsync("ReceiveJobProgress", update);
                _logger.LogDebug("Job progress update sent for job {JobId}: {Progress}%", update.JobId, update.Progress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send job progress update via SignalR");
            }
        }
    }
} 