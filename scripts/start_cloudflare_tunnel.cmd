@echo off
setlocal
cd /d "%~dp0.."
if not exist ".tools\cloudflared.exe" (
  echo cloudflared.exe was not found in .tools
  exit /b 1
)
if not exist ".logs" mkdir ".logs"
if "%PORT%"=="" set PORT=3000
".tools\cloudflared.exe" tunnel --no-autoupdate --logfile ".logs\cloudflared.log" --url http://127.0.0.1:%PORT%