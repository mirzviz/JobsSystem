using System.Threading.Tasks;
using JobManagementSystem.Core.Models;

namespace JobManagementSystem.Core.Interfaces
{
    public interface IJobProgressNotifier
    {
        Task NotifyJobProgressAsync(JobProgressUpdate update);
    }
} 