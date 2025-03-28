using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using JobManagementSystem.Infrastructure.Data;
using JobManagementSystem.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors;

var builder = WebApplication.CreateBuilder(args);

// Add PostgreSQL database
builder.Services.AddDbContext<JobManagementDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection") ?? 
        "Host=localhost;Database=jobmanagement;Username=postgres;Password=postgres"));

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddSingleton<WorkerNodeService>();
builder.Services.AddScoped<IJobQueue, EfCoreJobQueue>();
builder.Services.AddHostedService<BackgroundJobProcessor>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<WorkerNodeService>());

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { 
        Title = "Job Management System API", 
        Version = "v1",
        Description = "A distributed job processing system that scales horizontally. Each instance processes one job at a time."
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Job Management System API V1");
    c.RoutePrefix = string.Empty;
});

// Enable CORS early in the pipeline
app.UseCors();

// Configure routing and authorization
app.UseRouting();
app.UseAuthorization();
app.MapControllers();

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<JobManagementDbContext>();
    dbContext.Database.EnsureCreated();
    
    // Create test jobs on startup
    var jobQueue = scope.ServiceProvider.GetRequiredService<IJobQueue>();
    
    // Create test jobs
    await jobQueue.EnqueueJobAsync("High Priority Job 1", JobPriority.High);
    await jobQueue.EnqueueJobAsync("Regular Job 1", JobPriority.Regular);
    await jobQueue.EnqueueJobAsync("High Priority Job 2", JobPriority.High);
    await jobQueue.EnqueueJobAsync("Regular Job 2", JobPriority.Regular);
    await jobQueue.EnqueueJobAsync("High Priority Job 3", JobPriority.High);
}

Console.WriteLine("=======================================================");
Console.WriteLine("Job Management System - Horizontally Scalable Version");
Console.WriteLine("This instance processes one job at a time.");
Console.WriteLine("To scale horizontally, run additional instances of the application on different ports.");
Console.WriteLine("=======================================================");

// Run the application
await app.RunAsync();
