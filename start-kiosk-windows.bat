@echo off
rem SPARDHA 2K26 Round 3 - true kiosk mode: Esc / F11 cannot leave full screen. Close with Alt+F4 after the round.
rem Usage: double-click, or  start-kiosk-windows.bat https://your-site/index.html
set "URL=%~1"
if "%URL%"=="" set "URL=%~dp0index.html"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
start "" "%CHROME%" --kiosk --user-data-dir="%TEMP%\spardha-kiosk" --no-first-run "%URL%"
