#!/usr/bin/env bash
set -e

# Toolbox-XMLs ins /config/www kopieren (damit sie über /local/ erreichbar sind)
mkdir -p /config/www/toolbox/de /config/www/toolbox/en
cp -r /frontend/public/toolbox/de/* /config/www/toolbox/de/ || true
cp -r /frontend/public/toolbox/en/* /config/www/toolbox/en/ || true

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