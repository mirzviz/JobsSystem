using System.Threading.Tasks;
using JobManagementSystem.Core.Models;
using Microsoft.AspNetCore.SignalR;

namespace JobManagementSystem.Api.Hubs
{
    public class WorkerStatusHub : Hub
    {
        private readonly IHubContext<WorkerStatusHub> _hubContext;

        public WorkerStatusHub(IHubContext<WorkerStatusHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendWorkerStatusUpdate(WorkerStatusUpdate update)
        {
            await _hubContext.Clients.All.SendAsync("ReceiveWorkerStatus", update);
        }
    }
} 