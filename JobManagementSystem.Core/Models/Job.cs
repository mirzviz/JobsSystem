using System;

namespace JobManagementSystem.Core.Models
{
    public class Job
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public JobPriority Priority { get; set; }
        public JobStatus Status { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int Progress { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ErrorMessage { get; set; }
        public int RetryCount { get; set; }
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