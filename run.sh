#!/bin/bash
# Setup and Run script for Gym Bunnies Flask App

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Gym Bunnies Setup & Run Script ---"

VENV_NAME="venv"

# 1. Check if virtual environment exists, if not create it
if [ ! -d "$VENV_NAME" ]; then
    echo "Creating virtual environment '$VENV_NAME'..."
    # Use python3, as 'python' can be ambiguous
    python3 -m venv $VENV_NAME
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create virtual environment. Make sure python3 and venv are installed."
        exit 1
    fi
else
    echo "Virtual environment '$VENV_NAME' already exists."
fi

# 2. Activate the virtual environment
echo "Activating virtual environment..."
source $VENV_NAME/bin/activate

# 3. Install/upgrade requirements
echo "Installing requirements from requirements.txt..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Error: Failed to install requirements."
    deactivate
    exit 1
fi

# 4. Initialize the database
# Check if the DB file exists. If not, run init_db.py
if [ ! -f "gym_bunnies.db" ]; then
    echo "Database 'gym_bunnies.db' not found. Initializing..."
    python init_db.py
    if [ $? -ne 0 ]; then
        echo "Error: Failed to initialize database."
        deactivate
        exit 1
    fi
else
    echo "Database 'gym_bunnies.db' already exists. Skipping initialization."
fi

# --- Run ---
echo ""
echo "--- Setup Complete ---"
echo "Starting the Flask application..."
echo "Access the app at http://127.0.0.1:5000"
echo "Press CTRL+C to stop the server."
echo ""

# 5. Run the Flask app
# Use flask run for development
export FLASK_APP=app.py
export FLASK_ENV=development # Enables debug mode
flask run

# Deactivate venv on script exit
deactivate
echo "Server stopped. Virtual environment deactivated."