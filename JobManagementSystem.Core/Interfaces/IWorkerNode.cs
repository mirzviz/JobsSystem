using System;
using System.Threading.Tasks;
using JobManagementSystem.Core.Models;

namespace JobManagementSystem.Core.Interfaces
{
    public interface IWorkerNode
    {
        string NodeId { get; }
        WorkerStatus Status { get; }
        Task<bool> StartJobAsync(Job job);
        Task<bool> StopJobAsync(Guid jobId);
        Task UpdateStatusAsync(WorkerStatus status);
    }

    public enum WorkerStatus
    {
        Active,
        Idle,
        Offline
    }
} 