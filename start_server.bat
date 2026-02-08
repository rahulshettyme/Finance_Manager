@echo off
echo Starting Finance Manager Server...
echo.
echo Server will run on http://localhost:8080
echo Password: Shrira@1234
echo.
echo Open http://localhost:8080 in your browser to access the app
echo Press Ctrl+C to stop the server
echo.
npm start
if errorlevel 1 pause
