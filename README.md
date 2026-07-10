# Cafe Hunter

## Overview
Cafe Hunter is a web application designed to help users discover, rate, and share their favorite local cafes. Whether you are looking for the perfect cold brew, a quiet study spot, or the best aesthetic for your next session, Cafe Hunter tracks down the ideal vibe.

## Features
*   **Search & Filter:** Find cafes by location, rating, and specific amenities (e.g., Wi-Fi, power outlets).
*   **Interactive Maps:** View and locate cafes on an integrated map interface.
*   **User Reviews:** Share your experiences, drop ratings, and upload photos of your cafe visits.
*   **Curated Lists:** Save your favorite spots to personalized user dashboards.

## Tech Stack

*    HTML, CSS, JavaScript, React
## Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/yourusername/cafe-hunter.git](https://github.com/yourusername/cafe-hunter.git)
    cd cafe-hunter
    ```

2.  **Install dependencies:**
    ```bash
    # For frontend
    cd client
    npm install
    
    # For backend (Node.js example)
    cd ../server
    npm install
    
    # OR for backend (Python/Django example)
    pip install -r requirements.txt
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add your necessary keys (e.g., Database URI, Map API keys).
    
4.  **Configure the API Key (Required):**
    This project requires an API key to fetch cafe data. 
    * Create a `.env` file in the root directory.
    * Add your API key using the following format:
      ```env
      API_KEY=your_api_key_here
      ```
    * **Security Note:** Make sure your `.env` file is included in your `.gitignore` so your API key is not publicly exposed on GitHub.

5.  **Run the application:**
    ```bash
    # Start frontend
    npm start
    
    # Start backend
    npm run dev # or python manage.py runserver
    ```

## Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute to the codebase.

## Contact
**Rohit** - b24bs2288@iitj.ac.in
