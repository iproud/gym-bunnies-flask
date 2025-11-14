import sqlite3
import os

# Define the database file name
DB_NAME = 'gym_bunnies.db'
SCHEMA_FILE = 'schema.sql'

def initialize_database():
    """
    Initializes the SQLite database by dropping existing tables (if any)
    and creating new ones based on the schema.sql file.
    """
    # Check if the database file already exists, and remove it to start fresh
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)
        print(f"Removed old database file: {DB_NAME}")

    # Connect to the SQLite database (this will create the file)
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Read the schema file
    try:
        with open(SCHEMA_FILE, 'r') as f:
            schema_sql = f.read()
    except FileNotFoundError:
        print(f"Error: {SCHEMA_FILE} not found.")
        print("Please create the schema.sql file with your SQLite table definitions.")
        conn.close()
        return

    # Execute the schema SQL (which may contain multiple statements)
    try:
        cursor.executescript(schema_sql)
        print(f"Successfully created database and tables in {DB_NAME}")
    except sqlite3.Error as e:
        print(f"An error occurred while creating tables: {e}")

    # Commit changes and close the connection
    conn.commit()
    conn.close()

if __name__ == '__main__':
    initialize_database()