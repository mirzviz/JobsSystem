# Job Management System

A distributed background job management system built with .NET that allows you to create, monitor, and manage background jobs with different priorities and statuses.

## Features

- Create jobs with different priorities (High, Regular)
- Monitor job progress and status in real-time
- Concurrent job execution (default: 3 jobs at a time)
- Job status tracking (Pending, Running, Completed, Failed, Stopped)
- Support for job management operations:
  - Start/Stop jobs
  - Monitor progress
  - Restart failed jobs
  - Delete completed/failed jobs

## Prerequisites

- .NET 9.0 SDK or later
- Visual Studio 2022 or VS Code with C# extension

## Project Structure

- **JobManagementSystem.Core**: Contains domain models and interfaces
- **JobManagementSystem.Infrastructure**: Contains implementations of services
- **JobManagementSystem.Api**: Console application to demonstrate the system

## Running the Application

1. Clone the repository
2. Navigate to the project root directory
3. Run the following commands:

```bash
# Build the solution
dotnet build

# Run the application
dotnet run --project JobManagementSystem.Api
```

## Testing the System

When you run the application, it will automatically:

1. Create 5 test jobs:
   - 3 High priority jobs
   - 2 Regular priority jobs
2. Process these jobs concurrently (3 at a time)
3. Show progress updates in the console
4. Display job status changes

You'll see output similar to:
```
Creating test jobs...
Press any key to exit
info: Starting job {jobId}
info: Job {jobId} progress: 10%
info: Job {jobId} progress: 20%
...
```

## Job States

Jobs can be in the following states:
- **Pending**: Job is waiting to be processed
- **Running**: Job is currently being processed
- **Completed**: Job has finished successfully
- **Failed**: Job encountered an error
- **Stopped**: Job was manually stopped

## Implementation Details

- Uses in-memory storage for job data (InMemoryJobQueue)
- Implements concurrent job processing with configurable parallelism
- Supports job prioritization (High priority jobs are processed first)
- Includes real-time progress tracking
- Provides graceful shutdown handling

## Stopping the Application

Press any key to stop the application. The system will:
1. Stop accepting new jobs
2. Wait for running jobs to complete
3. Perform a graceful shutdown

## Note

This is a demonstration version using in-memory storage. For production use, you would want to:
1. Use a persistent database (the EntityFramework implementation is already included)
2. Add authentication and authorization
3. Implement proper error handling and retry mechanisms
4. Add monitoring and alerting capabilities 