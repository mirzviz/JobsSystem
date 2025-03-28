using JobManagementSystem.Core.Interfaces;
using JobManagementSystem.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace JobManagementSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobsController : ControllerBase
{
    private readonly IJobQueue _jobQueue;

    public JobsController(IJobQueue jobQueue)
    {
        _jobQueue = jobQueue;
    }

    public class CreateJobRequest
    {
        public string Name { get; set; } = string.Empty;
        public JobPriority Priority { get; set; }
        public DateTime? ScheduledStartTime { get; set; }
    }

    [HttpPost]
    public async Task<ActionResult<Job>> CreateJob([FromBody] CreateJobRequest request)
    {
        if (request == null)
        {
            return BadRequest("Request cannot be null");
        }

        if (string.IsNullOrEmpty(request.Name))
        {
            return BadRequest("Job name is required");
        }

        var job = await _jobQueue.EnqueueJobAsync(request.Name, request.Priority, request.ScheduledStartTime);
        return CreatedAtAction(nameof(GetJob), new { id = job.Id }, job);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Job>>> GetJobs()
    {
        var jobs = await _jobQueue.GetJobsAsync();
        return Ok(jobs);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Job>> GetJob(Guid id)
    {
        var job = await _jobQueue.GetJobAsync(id);
        if (job == null)
        {
            return NotFound();
        }
        return Ok(job);
    }

    [HttpPut("{id}/progress")]
    public async Task<ActionResult<Job>> UpdateProgress(Guid id, [FromBody] int progress)
    {
        var job = await _jobQueue.UpdateJobProgressAsync(id, progress);
        if (job == null)
        {
            return NotFound();
        }
        return Ok(job);
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<Job>> UpdateStatus(Guid id, [FromBody] JobStatus status)
    {
        var job = await _jobQueue.UpdateJobStatusAsync(id, status);
        if (job == null)
        {
            return NotFound();
        }
        return Ok(job);
    }

    [HttpPost("{id}/stop")]
    public async Task<ActionResult<Job>> StopJob(Guid id)
    {
        var job = await _jobQueue.StopJobAsync(id);
        if (job == null)
        {
            return NotFound();
        }
        return Ok(job);
    }

    [HttpPost("{id}/restart")]
    public async Task<ActionResult<Job>> RestartJob(Guid id)
    {
        var job = await _jobQueue.RestartJobAsync(id);
        if (job == null)
        {
            return NotFound();
        }
        return Ok(job);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteJob(Guid id)
    {
        await _jobQueue.DeleteJobAsync(id);
        return NoContent();
    }
} 