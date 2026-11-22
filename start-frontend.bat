@echo off
title Uptoware Fleet ERP - Frontend (Port 3001 - Local Demo Mode)
cd /d "%~dp0frontend"
set LOCAL_DEMO_MODE=true
echo ====================================================
echo Starting Uptoware Fleet ERP Local Sandbox (Port 3001)
echo Mode: LOCAL DEMO (Isolated 1-1 data per module)
echo URL: http://localhost:3001
echo Production (fleet.uptoware.com) is 100%% PROTECTED & CLEAN!
echo ====================================================
npm run dev -- -p 3001
pause

