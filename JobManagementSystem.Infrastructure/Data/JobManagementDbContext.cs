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

        public DbSet<Job> Jobs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Job>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired();
                entity.Property(e => e.Priority).IsRequired();
                entity.Property(e => e.Status).IsRequired();
                entity.Property(e => e.Progress).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
            });
        }
    }
} 