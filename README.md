# AI Chat App

A React application with a Python FastAPI backend for chatting with AI using the Vercel AI SDK.

## Features

- Modern UI built with Next.js, React 18, and shadcn/ui
- Python FastAPI backend
- Real-time chat interface using Vercel AI SDK (@ai-sdk/react)
- Responsive sidebar navigation
- Generic API routing with automatic request forwarding

## Getting Started

### Prerequisites

- Node.js 20+ (via nvm)
- pnpm (preferred package manager)
- Python 3.12+
- uv (Python package manager and virtual environment tool)

### Installation

1. Clone the repository

2. **Node.js Setup**:
   ```bash
   # Use the correct Node.js version
   nvm use
   # or if not installed
   nvm install
   
   # Install pnpm if not already installed
   npm install -g pnpm
   
   # Install dependencies
   pnpm install
   ```

3. **Python Setup**:
   ```bash
   # Option 1: Use the provided script (recommended)
   # This script will:
   # - Check for required dependencies (nvm, uv)
   # - Create a virtual environment in the api folder if it doesn't exist
   # - Activate the Node.js environment using nvm
   # - Activate the Python virtual environment
   # - Install the API project in development mode
   #
   # IMPORTANT: The script must be sourced, not executed
   source ./activate.sh
   # or
   . ./activate.sh
   
   # Option 2: Manual setup
   # Create a virtual environment in the api folder
   cd api
   uv venv .venv --python=3.12
   
   # Activate the virtual environment
   source .venv/bin/activate
   
   # Install the project in development mode
   uv pip install -e .
   
   # Return to the root directory
   cd ..
   ```

4. **Environment Configuration**:
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit the .env.local file with your settings
   ```

### Running the Application

To run both the frontend and backend together with hot reloading:

```bash
pnpm run dev:all
```

This will start:
- Next.js frontend with Turbo (fast refresh enabled)
- FastAPI backend with hot reloading (automatically restarts when code changes)

Or run them separately:

- Frontend: `pnpm run dev` (with Turbo fast refresh)
- Backend: `pnpm run api:dev` (with hot reloading)
- Backend (production mode): `pnpm run api` (without hot reloading)

## Project Structure

- `/src` - Next.js frontend
  - `/app` - Next.js app router
    - `/api/[[...path]]` - Generic API route handler that forwards requests to the backend
  - `/components` - React components
  - `/lib` - Utility functions and configuration
- `/api` - Python FastAPI backend
- `.venv` - Python virtual environment
- `.nvmrc` - Node.js version specification

## API Routing

The application uses a generic API route handler that automatically forwards all requests from `/api/*` to the Python backend. This simplifies the frontend code and allows for a clean separation between the frontend and backend.

For example:
- A request to `/api/chat` in the frontend is forwarded to `http://localhost:6666/api/chat` in the backend
- A request to `/api/some/other/path` is forwarded to `http://localhost:6666/api/some/other/path`

This approach allows you to add new API endpoints in the backend without having to create corresponding route handlers in the frontend.

## Technologies Used

- **Frontend**:
  - Next.js 14 with Turbo (for faster builds and development)
  - React 18
  - Vercel AI SDK
  - shadcn/ui (built on Radix UI and Tailwind CSS)
  - TypeScript

- **Backend**:
  - FastAPI
  - Python 3.12
  - Uvicorn
  - OpenAI SDK

## Development Tools

- **Node.js**: Managed with nvm (Node Version Manager)
- **Package Management**: pnpm for efficient dependency management
- **Build System**: Turbo for faster frontend builds and development
- **Python**: Managed with uv (fast Python package installer and virtual environment tool)

## Environment Variables

The application uses environment variables for configuration. These are loaded from `.env.local` file in the project root.

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_URL` | URL of the Python backend API | `http://localhost:6666` |
| `OPENAI_API_KEY` | OpenAI API key (if needed) | - |

To set up your environment:

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit the `.env.local` file with your settings.

## License

MIT
