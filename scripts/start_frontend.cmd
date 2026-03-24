@echo off
setlocal
cd /d "%~dp0..\frontend\nextjs-app"
set NEXT_PUBLIC_API_URL=
set BACKEND_INTERNAL_URL=http://127.0.0.1:8000
if "%PORT%"=="" set PORT=3000
npm.cmd run start
