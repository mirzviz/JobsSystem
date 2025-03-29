using System;

namespace JobManagementSystem.Core.Models
{
    public class WorkerStatusUpdate
    {
        public Guid NodeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public WorkerStatus Status { get; set; }
        public bool IsProcessingJob { get; set; }
        public Guid? CurrentJobId { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
} 