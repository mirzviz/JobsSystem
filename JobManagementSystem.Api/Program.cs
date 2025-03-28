using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using JobManagementSystem.Infrastructure.Services;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddSingleton<IJobQueue, InMemoryJobQueue>();
builder.Services.AddHostedService<BackgroundJobProcessor>();

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
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Job Management System API", Version = "v1" });
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

// Create some test jobs on startup
using (var scope = app.Services.CreateScope())
{
    var jobQueue = scope.ServiceProvider.GetRequiredService<IJobQueue>();
    
    // Create test jobs
    await jobQueue.EnqueueJobAsync("High Priority Job 1", JobPriority.High);
    await jobQueue.EnqueueJobAsync("Regular Job 1", JobPriority.Regular);
    await jobQueue.EnqueueJobAsync("High Priority Job 2", JobPriority.High);
    await jobQueue.EnqueueJobAsync("Regular Job 2", JobPriority.Regular);
    await jobQueue.EnqueueJobAsync("High Priority Job 3", JobPriority.High);
}

// Run the application
await app.RunAsync();
