using Microsoft.EntityFrameworkCore;
using JobManagementSystem.Core.Models;

namespace JobManagementSystem.Infrastructure.Data
{
    public class JobManagementDbContext : DbContext
    {
        public JobManagementDbContext(DbContextOptions<JobManagementDbContext> options)
            : base(options)
        {
        }

        public DbSet<Job> Jobs { get; set; } = null!;
        public DbSet<WorkerNode> WorkerNodes { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure Job entity
            modelBuilder.Entity<Job>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.Name).IsRequired();
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Status).HasDefaultValue(JobStatus.Pending);
                entity.Property(e => e.Progress).HasDefaultValue(0);
                
                // Index for efficient job claiming by priority and status
                entity.HasIndex(e => new { e.Priority, e.Status, e.WorkerNodeId });
            });

            // Configure WorkerNode entity
            modelBuilder.Entity<WorkerNode>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.Name).IsRequired();
                entity.Property(e => e.LastHeartbeat).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            base.OnModelCreating(modelBuilder);
        }
    }
} 