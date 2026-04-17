@echo off
title TELA ERP Setup
color 0A
echo.
echo  ============================================
echo   TELA ERP — First-Time Setup
echo  ============================================
echo.

:: Check for Node.js
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  ERROR: Node.js is not installed.
    echo.
    echo  Please install Node.js v18 or later from:
    echo    https://nodejs.org/en/download
    echo.
    echo  After installing Node.js, run this setup again.
    echo.
    pause
    start "" "https://nodejs.org/en/download"
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  Node.js found: %NODE_VER%
echo.
echo  Installing dependencies (this may take a minute)...
echo.

cd /d "%~dp0"
call npm install --omit=dev

if errorlevel 1 (
    color 0C
    echo.
    echo  ERROR: npm install failed.
    echo  Please make sure you have an internet connection and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   Setup complete!
echo  ============================================
echo.
echo  Run "start.bat" to launch TELA ERP.
echo.
pause
