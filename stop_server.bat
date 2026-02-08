@echo off
echo Stopping Finance Manager Server...
echo.

REM Find and kill Node.js processes running on port 8080
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do (
    echo Stopping process ID: %%a
    taskkill /F /PID %%a
)

echo.
echo Server stopped successfully!
echo.
pause
