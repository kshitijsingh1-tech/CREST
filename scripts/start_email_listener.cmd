@echo off
setlocal
cd /d "%~dp0.."
set PYTHONPATH=%CD%
if "%EMAIL_POLL_INTERVAL_SECS%"=="" set EMAIL_POLL_INTERVAL_SECS=60
echo Starting inbound email listener for %EMAIL_IMAP_USER%
echo Unseen messages in INBOX will be processed and then marked as Seen.
"%CD%\.venv\Scripts\python.exe" -m integrations.email.listener