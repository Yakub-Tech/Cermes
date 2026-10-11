@echo off
title Cermes wird beendet ...
cd /d "%~dp0"

echo Beende Cermes ...
docker compose down
if errorlevel 1 (
  echo FEHLER: Cermes konnte nicht sauber beendet werden. Siehe Meldungen oben.
  pause
  exit /b 1
)

echo Beende Docker Desktop ...
taskkill /IM "Docker Desktop.exe" /F >nul 2>&1

echo.
echo Cermes und Docker Desktop wurden beendet. Dieses Fenster kannst du schliessen.
pause
