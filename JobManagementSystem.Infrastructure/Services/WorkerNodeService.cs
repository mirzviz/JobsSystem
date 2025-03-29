using System;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using JobManagementSystem.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JobManagementSystem.Infrastructure.Services;

public class WorkerNodeService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WorkerNodeService> _logger;
    private readonly IWorkerStatusNotifier? _workerStatusNotifier;
    private readonly Guid _nodeId;
    private readonly string _nodeName;
    private readonly TimeSpan _heartbeatInterval = TimeSpan.FromSeconds(15);

    public WorkerNodeService(
        IServiceProvider serviceProvider,
        ILogger<WorkerNodeService> logger,
        IWorkerStatusNotifier? workerStatusNotifier = null)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _workerStatusNotifier = workerStatusNotifier;
        _nodeId = Guid.NewGuid();
        _nodeName = $"Worker-{_nodeId.ToString().Substring(0, 8)}-{GetLocalIPAddress()}";
    }

    public Guid NodeId => _nodeId;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Worker node service starting with ID: {NodeId}", _nodeId);

        // Register this worker node
        await RegisterNodeAsync(stoppingToken);

        // Send heartbeats periodically
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await UpdateNodeHeartbeatAsync(stoppingToken);
                await Task.Delay(_heartbeatInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Shutdown requested
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in worker node heartbeat");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        // Deregister on shutdown
        try
        {
            await DeregisterNodeAsync(CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deregistering node during shutdown");
        }
    }

    private async Task RegisterNodeAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<JobManagementDbContext>();

        var node = new WorkerNode
        {
            Id = _nodeId,
            Name = _nodeName,
            LastHeartbeat = DateTime.UtcNow,
            IsActive = true,
            IsProcessingJob = false,
            Status = WorkerStatus.Available
        };

        dbContext.WorkerNodes.Add(node);
        await dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Worker node registered: {NodeId}", _nodeId);
        
        // Send worker status update
        await SendWorkerStatusUpdateAsync(node);
    }

    private async Task UpdateNodeHeartbeatAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<JobManagementDbContext>();

        var node = await dbContext.WorkerNodes.FindAsync(new object[] { _nodeId }, cancellationToken);
        if (node != null)
        {
            node.LastHeartbeat = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            
            // Send worker status update
            await SendWorkerStatusUpdateAsync(node);
        }
        else
        {
            // Node not found, try to re-register
            await RegisterNodeAsync(cancellationToken);
        }
    }

    private async Task DeregisterNodeAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<JobManagementDbContext>();

        var node = await dbContext.WorkerNodes.FindAsync(new object[] { _nodeId }, cancellationToken);
        if (node != null)
        {
            node.IsActive = false;
            node.Status = WorkerStatus.Offline;
            await dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Worker node deregistered: {NodeId}", _nodeId);
            
            // Send worker status update
            await SendWorkerStatusUpdateAsync(node);
        }
    }
    
    private async Task SendWorkerStatusUpdateAsync(WorkerNode node)
    {
        if (_workerStatusNotifier == null)
        {
            return;
        }

        try
        {
            var update = new WorkerStatusUpdate
            {
                NodeId = node.Id,
                Name = node.Name,
                Status = node.Status,
                IsProcessingJob = node.IsProcessingJob,
                CurrentJobId = node.CurrentJobId,
                Timestamp = DateTime.UtcNow
            };

            await _workerStatusNotifier.NotifyWorkerStatusAsync(update);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send worker status update");
        }
    }

    private string GetLocalIPAddress()
    {
        try
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            foreach (var ip in host.AddressList)
            {
                if (ip.AddressFamily == AddressFamily.InterNetwork)
                {
                    return ip.ToString();
                }
            }
        }
        catch
        {
            // Fallback to loopback if we can't get the IP
        }
        return "127.0.0.1";
    }
} 