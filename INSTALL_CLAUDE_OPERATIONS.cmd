@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-agent-system-to-claude.ps1"
set EXIT_CODE=%ERRORLEVEL%
echo.
if not "%EXIT_CODE%"=="0" echo Installation failed with exit code %EXIT_CODE%.
if "%EXIT_CODE%"=="0" echo Installation and local verification completed successfully.
pause
exit /b %EXIT_CODE%
