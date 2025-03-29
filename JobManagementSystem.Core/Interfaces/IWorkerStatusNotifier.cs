using System.Threading.Tasks;
using JobManagementSystem.Core.Models;

namespace JobManagementSystem.Core.Interfaces
{
    public interface IWorkerStatusNotifier
    {
        Task NotifyWorkerStatusAsync(WorkerStatusUpdate update);
    }
} 