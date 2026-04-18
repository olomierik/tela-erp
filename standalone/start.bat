@echo off
title TELA ERP
color 0A

cd /d "%~dp0"

:: Verify dependencies are installed
if not exist "node_modules\express" (
    color 0E
    echo  Dependencies not found. Running setup first...
    echo.
    call setup.bat
    if errorlevel 1 exit /b 1
)

echo.
echo  ============================================
echo   Starting TELA ERP...
echo  ============================================
echo.
echo  The app will open in your browser at:
echo    http://localhost:4321
echo.
echo  Keep this window open while using TELA ERP.
echo  Press Ctrl+C to stop the server.
echo.

node server.cjs

pause
