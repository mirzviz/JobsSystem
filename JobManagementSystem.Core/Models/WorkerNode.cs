using System;

namespace JobManagementSystem.Core.Models;

public class WorkerNode
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public DateTime LastHeartbeat { get; set; }
    public bool IsActive { get; set; }
    public bool IsProcessingJob { get; set; }
    public Guid? CurrentJobId { get; set; }
    public WorkerStatus Status { get; set; }
}

public enum WorkerStatus
{
    Available,
    Busy,
    Offline
} 