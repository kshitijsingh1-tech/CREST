@echo off
setlocal
cd /d D:\crest\CREST_v3\crest
set PYTHONPATH=D:\crest\CREST_v3\crest
"C:\Users\Lenovo\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn backend.main:socket_app --host 127.0.0.1 --port 8000 --env-file .env
