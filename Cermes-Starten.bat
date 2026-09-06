@echo off
setlocal enabledelayedexpansion
title Cermes wird gestartet ...
cd /d "%~dp0Quellcode"

echo Pruefe, ob Docker Desktop laeuft ...
docker info >nul 2>&1
if not errorlevel 1 goto docker_bereit

echo Docker Desktop laeuft noch nicht - wird gestartet ...
set "DOCKER_DESKTOP=C:\Program Files\Docker\Docker\Docker Desktop.exe"
if not exist "!DOCKER_DESKTOP!" (
  echo FEHLER: Docker Desktop wurde nicht unter "!DOCKER_DESKTOP!" gefunden.
  echo Bitte Docker Desktop von Hand starten und dieses Fenster erneut ausfuehren.
  pause
  exit /b 1
)
start "" "!DOCKER_DESKTOP!"

set /a versuche=0
:warte_auf_docker
set /a versuche+=1
timeout /t 2 >nul
docker info >nul 2>&1
if not errorlevel 1 goto docker_bereit
if !versuche! GEQ 60 (
  echo FEHLER: Docker Desktop ist nach 2 Minuten immer noch nicht bereit.
  echo Bitte pruefen, ob Docker Desktop von Hand gestartet werden kann.
  pause
  exit /b 1
)
goto warte_auf_docker

:docker_bereit
echo Docker Desktop ist bereit.

echo Ermittle Netzwerk-Adresse dieses Computers ...
set "CERMES_HOST_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1 -ExpandProperty IPv4Address).IPAddress"`) do set "CERMES_HOST_IP=%%i"

if defined CERMES_HOST_IP (
  echo Netzwerk-Adresse gefunden: !CERMES_HOST_IP!
) else (
  echo Netzwerk-Adresse konnte nicht automatisch ermittelt werden.
  echo Cermes startet trotzdem - die Adresse laesst sich in der App nachschlagen.
)

echo Starte Cermes ...
docker compose up -d --build
if errorlevel 1 (
  echo FEHLER: Cermes konnte nicht gestartet werden. Siehe Meldungen oben.
  pause
  exit /b 1
)

echo Warte, bis Cermes erreichbar ist ...
set /a versuche=0
:warte_auf_server
set /a versuche+=1
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:8080/api/gesundheit' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto server_bereit
if !versuche! GEQ 30 (
  echo FEHLER: Cermes antwortet nach 1 Minute immer noch nicht.
  pause
  exit /b 1
)
timeout /t 2 >nul
goto warte_auf_server

:server_bereit
echo Cermes laeuft. Oeffne Browser ...

set "CHROME_PFAD="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_PFAD=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_PFAD=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_PFAD=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME_PFAD (
  start "" "!CHROME_PFAD!" "http://localhost:8080"
) else (
  start "" "http://localhost:8080"
)

echo.
echo Cermes laeuft. Dieses Fenster kannst du schliessen.
pause
