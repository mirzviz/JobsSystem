# Job Management System

A distributed background job management system built with .NET that allows you to create, monitor, and manage background jobs with different priorities and statuses.

## Features

- Create jobs with different priorities (High, Regular)
- Monitor job progress and status in real-time
- Horizontally scalable design - add more nodes for more processing power
- Job status tracking (Pending, Running, Completed, Failed, Stopped)
- Support for job management operations:
  - Start/Stop jobs
  - Monitor progress
  - Restart failed jobs
  - Delete completed/failed jobs

## Prerequisites

- .NET 9.0 SDK or later
- PostgreSQL database
- Swagger UI for API testing

## Horizontal Scaling Architecture

This system is designed for horizontal scalability:

1. **Node-Based Design**: Each application instance acts as a worker node
2. **Single Job Per Node**: Each worker processes exactly one job at a time
3. **Database Coordination**: PostgreSQL coordinates job distribution
4. **Atomic Job Claiming**: Workers claim jobs with an atomic SQL operation
5. **Worker Health Tracking**: Heartbeats detect failed workers
6. **Job Recovery**: Stalled jobs can be automatically recovered

To scale the system, simply run more instances on different ports. Each instance will:
- Register itself as a worker node
- Claim available jobs
- Process one job at a time
- Update job status and progress
- Release jobs when complete

## Project Structure

- **JobManagementSystem.Core**: Contains domain models and interfaces
- **JobManagementSystem.Infrastructure**: Contains implementations of services
- **JobManagementSystem.Api**: REST API and worker node implementation

## Database Configuration

The application uses PostgreSQL and securely manages the database password through environment variables:

1. The connection string in `appsettings.json` uses a placeholder for the password: `${DB_PASSWORD}`
2. Set the database password using an environment variable:

```bash
# Windows (PowerShell)
$env:DB_PASSWORD="yourpassword"

# Windows (Command Prompt)
set DB_PASSWORD=yourpassword

# Linux/macOS
export DB_PASSWORD=yourpassword
```

If the environment variable is not set, the application will default to using "devpass" as the password.

## Running the Application

1. Ensure PostgreSQL is installed and running
2. Set up the database password as described in the **Database Configuration** section
3. Run the application:

```bash
# Run the first instance
dotnet run --project JobManagementSystem.Api --urls http://localhost:5000

# In another terminal, run a second instance
dotnet run --project JobManagementSystem.Api --urls http://localhost:5001
```

## Testing the System

When you run the application, it will automatically:

1. Create the database if it doesn't exist
2. Create 5 test jobs:
   - 3 High priority jobs
   - 2 Regular priority jobs
3. Each worker node will claim and process jobs one at a time
4. Show progress updates in the console

You'll see output similar to:
```
Job Management System - Horizontally Scalable Version
This instance processes one job at a time.
To scale horizontally, run additional instances of the application on different ports.
=======================================================
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

## Stopping the Application

Press Ctrl+C to stop the application. The system will:
1. Stop accepting new jobs
2. Finish the current job or mark it as stopped
3. Perform a graceful shutdown

## Implementation Details

- Uses PostgreSQL database for job and worker node storage
- Implements atomic job claiming to prevent race conditions
- Worker nodes register and send heartbeats to maintain availability
- Supports job prioritization (High priority jobs are processed first)
- Includes real-time progress tracking
- Provides graceful shutdown handling

## Production Considerations

For a production deployment, consider:
1. Adding authentication and authorization
2. Implementing proper error handling and retry mechanisms
3. Adding monitoring and alerting capabilities
4. Setting up high availability for the PostgreSQL database
5. Using container orchestration like Kubernetes for automatic scaling 