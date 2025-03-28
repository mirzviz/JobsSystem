using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using JobManagementSystem.Core.Models;
using JobManagementSystem.Core.Interfaces;

namespace JobManagementSystem.Infrastructure.Hubs
{
    public class JobHub : Hub
    {
        public async Task JobUpdated(Job job)
        {
            await Clients.All.SendAsync("JobUpdated", job);
        }

        public async Task JobProgressUpdated(string jobId, int progress)
        {
            await Clients.All.SendAsync("JobProgressUpdated", jobId, progress);
        }

        public async Task WorkerStatusUpdated(string nodeId, WorkerStatus status)
        {
            await Clients.All.SendAsync("WorkerStatusUpdated", nodeId, status);
        }
    }
} 