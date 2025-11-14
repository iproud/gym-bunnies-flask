# README: Gym Bunnies Flask App

This is a standalone Flask web application for tracking gym workouts. It features user authentication, a workout log, and a module for managing gym equipment, including image uploads.

Images are handled by converting them to Base64 in the backend and storing them directly in the SQLite database as text.

## Features

*   User Authentication: Secure user registration and login system with hashed passwords.
*   Equipment Management: Full CRUD (Create, Read, Update, Delete) functionality for gym equipment.
*   Native Base64 Image Uploads: Images are uploaded via a standard form, converted to Base64 on the server, and stored in the database.
*   Workout & Set Tracking: API endpoints and database models are stubbed out for adding full workout and set-tracking functionality.
    

## Project Structure

/gym\_bunnies\_flask  
|-- venv/                  # Python virtual environment  
|-- app.py                 # Main Flask application (backend logic, API routes)  
|-- schema.sql             # SQLite database schema  
|-- init\_db.py             # Script to initialize the database  
|-- gym\_bunnies.db         # SQLite database file  
|-- requirements.txt       # Python dependencies  
|-- run.sh                 # All-in-one setup and run script  
|-- static/  
|   |-- style.css          # CSS styles  
|   |-- app.js             # Frontend JavaScript logic  
|-- templates/  
|   |-- index.html         # Main application page (after login)  
|   |-- login.html           # Login and Registration page  
|-- README.md              # This file  
  

## Setup and Running

This project includes a setup script (run.sh) that automates the entire process.

### Recommended Method (Using the Script)

1.  Make the script executable:  
    chmod +x run.sh  
      
    
2.  Run the script:  
    ./run.sh  
      
    

This script will:

*   Create a Python virtual environment (venv).
*   Activate it.
*   Install all required packages from requirements.txt.
*   Create the gym\_bunnies.db database from schema.sql (if it doesn't exist).
*   Start the Flask development server.
    

### Manual Setup

If you prefer to set up the project manually:

1.  Create and activate a virtual environment:  
    python3 -m venv venv  
    source venv/bin/activate  
      
    
2.  Install dependencies:  
    pip install -r requirements.txt  
      
    
3.  Initialize the database:  
    python init\_db.py  
      
    
4.  Run the application:  
    export FLASK\_APP=app.py  
    export FLASK\_ENV=development  
    flask run  
      
    

### Accessing the App

Once running, open your browser and go to http://127.0.0.1:5000.

You will be on the login page. You must register a new user to begin. After logging in, you will be redirected to the main dashboard. The "Equipment" tab is fully functional for adding, viewing, and editing items.

## How It Works

### Backend (app.py)

*   Database Models: Uses Flask-SQLAlchemy to define Python classes (User, GymEquipment, Workout, Set) that map directly to the SQLite tables.
*   Authentication: Uses Flask-Login for session management. Passwords are securely hashed using werkzeug.security.
*   Native Base64 Image Handling: The /api/equipment POST/PUT routes accept image file uploads. The server reads the file data, encodes it to a Base64 string, and saves it in the image\_base64 (TEXT) column.
*   API Routes: Provides a RESTful API for the frontend to interact with. The /api/equipment routes are fully implemented. Routes for workouts and sets are stubbed out and ready for implementation.
    

### Frontend (templates/ & static/)

*   login.html: A simple page with two forms for user login and registration.
*   index.html: The main app shell, rendered with user data after login. It features a tabbed interface.
*   app.js: Contains all frontend logic for switching tabs, fetching data from the Flask API (e.g., loadEquipment()), rendering equipment cards dynamically, and handling form submissions (including FormData for image uploads).
*   style.css: Provides minimal styling for the tabbed interface using Tailwind utility classes.
    

### Database (schema.sql & init\_db.py)

*   schema.sql: Contains the CREATE TABLE statements for SQLite. Note that MySQL types like longtext and enum have been translated to SQLite-compatible types (TEXT and TEXT CHECK(...)).
*   init\_db.py: A simple Python script that connects to (and creates) the gym\_bunnies.db file and executes the schema.sql script to build the tables.
    

## Next Steps

The API endpoints and frontend logic for the "Workout" and "User Settings" tabs are placeholders. To complete the application, you will need to:

1.  Implement the API routes in app.py for "Workout" and "User".
2.  Add JavaScript functions in app.js to fetch and render data for those new tabs.
3.  Build out the HTML structures within index.html for those tabs.