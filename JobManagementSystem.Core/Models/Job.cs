using System;

namespace JobManagementSystem.Core.Models
{
    public class Job
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public JobPriority Priority { get; set; }
        public JobStatus Status { get; set; }
        public int Progress { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? ErrorMessage { get; set; }
        public Guid? WorkerNodeId { get; set; } // The worker node that claimed this job
        public DateTime? LastClaimTime { get; set; } // When the job was last claimed
    }

    public enum JobPriority
    {
        Regular,
        High
    }

    public enum JobStatus
    {
        Pending,
        Running,
        Completed,
        Failed,
        Stopped
    }
} 