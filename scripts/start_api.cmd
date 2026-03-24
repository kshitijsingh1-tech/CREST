@echo off
setlocal
cd /d "%~dp0.."
set PYTHONPATH=%CD%
set CORS_ALLOW_ALL=1
"%CD%\.venv\Scripts\python.exe" -m uvicorn backend.main:socket_app --host 127.0.0.1 --port 8000 --env-file .env