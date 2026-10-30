@echo off
setlocal EnableExtensions
rem Run any command with the project's preferred Node 24+ binary.
rem Usage: tools\node24.cmd tools\serve.js
rem        tools\node24.cmd -e "console.log(process.version)"

set "NODE24="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0resolve-node24.ps1"`) do set "NODE24=%%i"

if not defined NODE24 (
  echo Failed to resolve Node 24+. See tools\resolve-node24.ps1
  exit /b 1
)

"%NODE24%" %*
exit /b %ERRORLEVEL%
