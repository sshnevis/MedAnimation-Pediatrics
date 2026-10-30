@echo off
rem Starts the zero-dependency preview server and opens the browser.
rem Uses Node 24+ (Cursor agent Node or ANIMATION_NODE / .node-path), not system Node 12.
rem Server: tools\serve.js (default port 8090, serves the project root)
rem Episode: change the ?ep= below to preview another episode.
cd /d "%~dp0"
start "" "http://127.0.0.1:8090/src/index.html"
call "%~dp0tools\node24.cmd" "%~dp0tools\serve.js"
pause
