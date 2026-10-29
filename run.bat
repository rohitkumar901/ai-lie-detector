@echo off
title AI Lie Detector Simulator - Polygraph HUD
cd /d "%~dp0"
color 0b
echo =====================================================================
echo          A.I. POLYGRAPH // LIE DETECTOR SIMULATOR
echo =====================================================================
echo  Starting Flask Server...
echo  URL: http://127.0.0.1:5000
echo =====================================================================

where python >nul 2>&1
if %errorlevel% equ 0 (
    python app.py
    pause
    exit /b
)

where py >nul 2>&1
if %errorlevel% equ 0 (
    py app.py
    pause
    exit /b
)

echo [ERROR] Python command not found in your system PATH!
pause
