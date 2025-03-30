# Job Management System

A distributed background job management system built with .NET that allows you to create, monitor, and manage background jobs.

## Features

- Create jobs with different priorities (High, Regular)
- Monitor job progress and status
- Horizontally scalable design
- Job status tracking (Pending, Running, Completed, Failed, Stopped)

## Prerequisites

- .NET 9.0 SDK or later
- PostgreSQL database
- Node.js 18.x or later
- npm or yarn package manager

## Project Structure

- **JobManagementSystem.Core**: Domain models and interfaces
- **JobManagementSystem.Infrastructure**: Service implementations
- **JobManagementSystem.Api**: REST API and worker node
- **JobManagementSystem.Web**: React frontend application

## Running the Application

### Backend API

1. Set up PostgreSQL and configure the connection string in `appsettings.json`
2. Run the application:

```bash
# First instance
dotnet run --project JobManagementSystem.Api --urls http://localhost:5000

# Second instance (optional)
dotnet run --project JobManagementSystem.Api --urls http://localhost:5001
```

### Frontend Application

1. Navigate to the frontend directory:
```bash
cd JobManagementSystem.Web
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The frontend application will be available at `http://localhost:5173` by default.

## Testing

Run the tests:
```bash
dotnet test
```

The system includes unit tests for:
- WorkerNodeService (node registration)
- BackgroundJobProcessor (job processing)
- EfCoreJobQueue (job queuing)

## Implementation Details

- PostgreSQL for job and worker storage
- Atomic job claiming to prevent race conditions
- Worker heartbeats for availability tracking
- Job prioritization (High priority first)
- Graceful shutdown handling 