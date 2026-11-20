@echo off
title Uptoware Fleet ERP - Frontend (Port 3001)
cd /d "%~dp0frontend"
echo ====================================================
echo Starting Uptoware Fleet ERP Frontend on Port 3001...
echo URL: http://localhost:3001
echo Backend: http://localhost:8080
echo ====================================================
npm run dev -- -p 3001
pause

