# AI Chat API

FastAPI backend for the AI Chat App. This API provides endpoints for chat functionality and can be extended to support other features.

## Features

- Chat endpoint for processing messages
- Environment variable configuration
- CORS support for frontend communication
- Hot reloading for development

## Setup

### Prerequisites

- Python 3.12+
- uv (Python package manager and virtual environment tool)

### Installation

1. Create a virtual environment directly in the API directory:
   ```bash
   # Navigate to the API directory if you're not already there
   cd api  # Skip if you're already in the api directory
   
   # Create the virtual environment
   uv venv .venv --python=3.12
   ```

2. Activate the virtual environment:
   ```bash
   source .venv/bin/activate
   ```

3. Install the project in development mode:
   ```bash
   uv pip install -e .
   ```

### Configuration

Create a `.env` file in the API directory with the following variables:

```
# API Server Configuration
PORT=6666
HOST=0.0.0.0

# Development Settings
DEBUG=true
RELOAD=true

# Add your OpenAI API key here if needed
# OPENAI_API_KEY=your_api_key_here
```

## Running the API

### Development Mode (with Hot Reloading)

Start the API server with hot reloading enabled:

```bash
# Set environment variables directly
DEBUG=true RELOAD=true python main.py

# Or use the npm/pnpm script from the root directory
cd ..
pnpm run api:dev
```

The server will automatically restart when you make changes to the code.

### Production Mode

Start the API server without hot reloading:

```bash
# Set environment variables directly
DEBUG=false RELOAD=false python main.py

# Or use the npm/pnpm script from the root directory
cd ..
pnpm run api
```

The API will be available at `http://localhost:6666` (or the port specified in your .env file).

## API Endpoints

- `POST /api/chat`: Process chat messages and return AI responses

## Development

This project uses:
- FastAPI for the web framework
- Uvicorn as the ASGI server
- Pydantic for data validation
- python-dotenv for environment variable management

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port to run the server on | `6666` |
| `HOST` | Host to bind the server to | `0.0.0.0` |
| `DEBUG` | Enable debug mode | `false` |
| `RELOAD` | Enable hot reloading | `true` |
| `OPENAI_API_KEY` | OpenAI API key (if needed) | - |
