@echo off
echo Starting Expo Development Server...
cd /d "%~dp0mobile"
call npx expo start
pause