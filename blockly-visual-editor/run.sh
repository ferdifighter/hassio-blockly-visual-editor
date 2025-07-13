#!/bin/bash
set -e

# scripts.json anlegen, falls nicht vorhanden
if [ ! -f /data/scripts.json ]; then
  echo '{"name":"","children":[],"id":"root"}' > /data/scripts.json
  echo "Lege /data/scripts.json an (leer)."
fi

echo "Starte run.sh..."
echo "Verzeichnisinhalt /:"
ls -l /

# Backend starten
exec node /backend/server.js 