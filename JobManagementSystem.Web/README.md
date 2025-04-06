# Job Management System Frontend

A React + TypeScript frontend for the Job Management System.

## Features

- Responsive job dashboard with real-time updates
- Job filtering and sorting
- Create new jobs with priorities
- Manage job lifecycle (stop, restart, delete)
- Real-time notifications for job status changes

## Prerequisites

- Node.js (version 16 or later)
- Backend API running at `http://localhost:5000`

## Environment Setup

Before running the application, you need to set up the environment variables:

1. Create a `.env` file in the root directory of the project
2. Add the following configuration:
```
VITE_API_URL=http://localhost:5000
VITE_ENABLE_SIGNALR_LOGS=true
```

Note: The `VITE_API_URL` should point to your backend API URL. If your backend is running on a different port or host, adjust the URL accordingly.

## Setup and Running

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview the production build:
```bash
npm run preview
```

## Project Structure

- `src/components/` - React components
- `src/services/` - API and SignalR services
- `src/types/` - TypeScript type definitions

## Backend Connection

The application is configured to connect to the backend API at `http://localhost:5000`. If your backend is running on a different URL, update the proxy configuration in `vite.config.ts`.