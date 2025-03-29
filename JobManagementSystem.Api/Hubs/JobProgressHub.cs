using System.Threading.Tasks;
using JobManagementSystem.Core.Models;
using Microsoft.AspNetCore.SignalR;

namespace JobManagementSystem.Api.Hubs
{
    public class JobProgressHub : Hub
    {
        private readonly IHubContext<JobProgressHub> _hubContext;

        public JobProgressHub(IHubContext<JobProgressHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendJobProgressUpdate(JobProgressUpdate update)
        {
            await _hubContext.Clients.All.SendAsync("ReceiveJobProgress", update);
        }
    }
} 