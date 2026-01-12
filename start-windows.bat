@echo off
REM RPS Web - Startup Script untuk Windows
REM Menjalankan Python API dan Next.js secara bersamaan

echo ========================================
echo RPS Generator Web Application
echo ========================================
echo.
echo IP Publik Laptop: 182.255.4.162
echo Nginx Forward (Server Lama): 206.189.45.199
echo.
echo Starting services...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python tidak terinstall!
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js tidak terinstall!
    pause
    exit /b 1
)

echo [1/2] Starting Python API Server (Port 5001)...
start "RPS Python API" cmd /k "cd python && python api_server.py --port 5001"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Next.js Dev Server (Port 3000)...
start "RPS Next.js" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo Python API: http://localhost:5001
echo Next.js Web: http://localhost:3000
echo.
echo Akses dari jaringan lokal:
echo   - http://192.168.x.x:3000 (ganti dengan IP lokal)
echo.
echo Akses dari internet (IP Publik):
echo   - http://182.255.4.162:3000
echo   CATATAN: Pastikan router sudah port forwarding
echo            Port 3000 dan 5001 ke PC ini
echo.
echo Server lama (nginx forward):
echo   - http://206.189.45.199 (tetap forward ke PC lama)
echo.
echo ========================================
echo Tekan Ctrl+C di window masing-masing untuk stop
echo ========================================
echo.
pause
