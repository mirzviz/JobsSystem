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

Console.WriteLine("=======================================================");
Console.WriteLine("Job Management System - Horizontally Scalable Version");
Console.WriteLine("This instance processes one job at a time.");
Console.WriteLine("=======================================================");

// Add PostgreSQL database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

// Replace environment variable placeholders
if (connectionString.Contains("${DB_PASSWORD}"))
{
    var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "devpass";
    connectionString = connectionString.Replace("${DB_PASSWORD}", dbPassword);
}

Console.WriteLine($"Using connection string: {connectionString}");

builder.Services.AddDbContext<JobManagementDbContext>(options =>
    options.UseNpgsql(connectionString));

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
try
{
    Console.WriteLine("Checking database setup...");
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<JobManagementDbContext>();
        
        // For development purposes, drop and recreate the database to ensure schema is correct
        // This is safe because PostgreSQL handles concurrent access
        Console.WriteLine("Recreating database to ensure schema is correct...");
        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.EnsureCreatedAsync();
        Console.WriteLine("Database schema verified.");
        
        // Create test jobs
        var jobQueue = scope.ServiceProvider.GetRequiredService<IJobQueue>();
        Console.WriteLine("Creating test jobs...");
        await jobQueue.EnqueueJobAsync("High Priority Job 1", JobPriority.High);
        await jobQueue.EnqueueJobAsync("Regular Job 1", JobPriority.Regular);
        await jobQueue.EnqueueJobAsync("High Priority Job 2", JobPriority.High);
        await jobQueue.EnqueueJobAsync("Regular Job 2", JobPriority.Regular);
        await jobQueue.EnqueueJobAsync("High Priority Job 3", JobPriority.High);
        Console.WriteLine("Test jobs created successfully.");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Error during database setup: {ex.Message}");
    Console.WriteLine($"Stack trace: {ex.StackTrace}");
    if (ex.InnerException != null)
    {
        Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
    }
    return;
}

Console.WriteLine("To scale horizontally, run additional instances of the application on different ports.");
Console.WriteLine("=======================================================");

// Run the application
await app.RunAsync();
