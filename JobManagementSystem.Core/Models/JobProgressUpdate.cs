using System;

namespace JobManagementSystem.Core.Models
{
    public class JobProgressUpdate
    {
        public string JobId { get; set; } = string.Empty;
        public int Progress { get; set; }
        public JobStatus Status { get; set; }
        public string? StatusMessage { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
} 