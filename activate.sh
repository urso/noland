#!/bin/bash

# =====================================================================
# WARNING: This script must be sourced, not executed!
# Run it with: source ./activate.sh (or . ./activate.sh)
# =====================================================================

# Check if the script is being sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "Error: This script must be sourced, not executed."
    echo "Please run it with: source ./activate.sh (or . ./activate.sh)"
    exit 1
fi

# Check for required dependencies
echo "Checking required dependencies..."

# Check for nvm
if ! command -v nvm &> /dev/null && [ ! -f "$HOME/.nvm/nvm.sh" ]; then
    echo "Error: nvm (Node Version Manager) is not installed or not in PATH."
    echo "Please install nvm from: https://github.com/nvm-sh/nvm#installing-and-updating"
    return 1
fi

# Load nvm if it exists but is not in PATH
if ! command -v nvm &> /dev/null && [ -f "$HOME/.nvm/nvm.sh" ]; then
    echo "Loading nvm..."
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
fi

# Check for uv
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed or not in PATH."
    echo "Please install uv with: pip install uv"
    echo "Or visit: https://github.com/astral-sh/uv"
    return 1
fi

echo "All required dependencies found."

# Use the correct Node.js version
echo "Activating Node.js environment..."
nvm use

# Check if api/.venv directory exists
if [ ! -d "api/.venv" ]; then
    echo "Virtual environment not found. Creating one..."
    
    # Create virtual environment in the api folder
    echo "Creating Python virtual environment with uv in the api folder..."
    cd api
    uv venv .venv --python=3.12
    
    if [ $? -ne 0 ]; then
        echo "Failed to create virtual environment. uv was unable to find or download Python 3.12."
        echo "You may need to install Python 3.12 manually if uv couldn't download it automatically."
        cd ..
        return 1
    fi
    
    echo "Virtual environment created successfully."
    
    # Activate the virtual environment to install dependencies
    echo "Activating virtual environment to install dependencies..."
    source .venv/bin/activate
    
    # Install dependencies from pyproject.toml
    echo "Installing API project dependencies..."
    uv pip install -e .
    
    # Return to the root directory
    cd ..
else
    echo "Found existing virtual environment in api/.venv"
fi

# Activate the Python virtual environment
echo "Activating Python virtual environment..."
source api/.venv/bin/activate

# Print Python version
echo "Python $(python --version 2>&1)"

# Print installed packages
echo "Installed packages:"
uv pip list

echo ""
echo "Development environment activated successfully!"
echo "- Node.js is managed by nvm"
echo "- Python virtual environment is active (located in api/.venv)"
echo "- Run 'deactivate' to exit the Python virtual environment" 