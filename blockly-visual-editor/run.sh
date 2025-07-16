#!/usr/bin/with-contenv bashio
set -e

# scripts.json anlegen, falls nicht vorhanden
if [ ! -f /data/scripts.json ]; then
  echo '{"name":"","children":[],"id":"root"}' > /data/scripts.json
  echo "Lege /data/scripts.json an (leer)."
fi

echo "Starte run.sh..."

# Umgebungsvariablen manuell setzen, da bashio die Template-Strings nicht auflöst
export SUPERVISOR_TOKEN="$(bashio::supervisor.token)"
export SUPERVISOR_URL="$(bashio::supervisor.url)"

# Debug: Alle relevanten Umgebungsvariablen ausgeben
echo "Verfügbare Umgebungsvariablen:"
echo "SUPERVISOR_TOKEN: ${SUPERVISOR_TOKEN:+gesetzt (Länge: ${#SUPERVISOR_TOKEN})}"
echo "SUPERVISOR_URL: ${SUPERVISOR_URL:-nicht gesetzt}"
echo "hass_token: ${hass_token:+gesetzt (Länge: ${#hass_token})}"
echo "hass_api_url: ${hass_api_url:-nicht gesetzt}"

# Backend starten
exec node /backend/server.js 