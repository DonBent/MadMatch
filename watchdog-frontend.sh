#!/bin/bash
# MadMatch Frontend Watchdog
# Kills zombie React processes blocking port 3000

PORT=3000
SERVICE="madmatch-dev-frontend"

# Check if something is listening on port 3000
if lsof -i :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  # Check if it's our service
  if ! systemctl is-active --quiet $SERVICE; then
    echo "[$(date)] Zombie process detected on port $PORT, service is down. Killing..."
    fuser -k ${PORT}/tcp
    sleep 2
    systemctl start $SERVICE
    echo "[$(date)] Service restarted"
  fi
else
  # Port is free but service is down
  if ! systemctl is-active --quiet $SERVICE; then
    echo "[$(date)] Service down, port free. Starting service..."
    systemctl start $SERVICE
  fi
fi
