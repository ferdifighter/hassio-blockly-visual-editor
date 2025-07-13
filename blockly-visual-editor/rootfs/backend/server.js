const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8099;
const HOST = '0.0.0.0';
const yaml = require('js-yaml');
const axios = require('axios');
require('dotenv').config();

// Home Assistant Umgebungsvariablen
const HA_TOKEN = process.env.SUPERVISOR_TOKEN;
const HA_URL = process.env.SUPERVISOR_URL || 'http://supervisor/core';

// Immer /data/scripts.json verwenden
const SCRIPTS_PATH = '/data/scripts.json';

// Beim Start: scripts.json anlegen, falls nicht vorhanden
if (!fs.existsSync(SCRIPTS_PATH)) {
  const initialData = {
    id: 'root',
    name: '',
    children: []
  };
  fs.writeFileSync(SCRIPTS_PATH, JSON.stringify(initialData, null, 2));
  console.log('Lege /data/scripts.json an (verschachteltes Objekt-Format mit Root).');
}

const AUTOMATIONS_PATH = '/data/automations.yaml';

// Beim Start: automations.yaml anlegen, falls nicht vorhanden
if (!fs.existsSync(AUTOMATIONS_PATH)) {
  fs.writeFileSync(AUTOMATIONS_PATH, yaml.dump([]));
  console.log('Lege /data/automations.yaml an (leeres Array).');
}

app.use(express.json());

// CORS für lokale Entwicklung erlauben
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 1. API-Routen
app.get('/api/scripts', (req, res) => {
  fs.readFile(SCRIPTS_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Lesen von scripts.json:', err, '\nPfad:', SCRIPTS_PATH, '\nStack:', err.stack);
      return res.status(500).json({ error: `Konnte scripts.json nicht lesen (${SCRIPTS_PATH}): ${err.message}` });
    }
    res.json(JSON.parse(data));
  });
});

app.put('/api/scripts', (req, res) => {
  fs.writeFile(SCRIPTS_PATH, JSON.stringify(req.body, null, 2), err => {
    if (err) {
      console.error('Fehler beim Schreiben von scripts.json:', err, '\nPfad:', SCRIPTS_PATH, '\nStack:', err.stack);
      return res.status(500).json({ error: `Konnte scripts.json nicht speichern (${SCRIPTS_PATH}): ${err.message}` });
    }
    res.json({ success: true });
  });
});

// API: Alle Automatisierungen laden
app.get('/api/automations', (req, res) => {
  fs.readFile(AUTOMATIONS_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Lesen von automations.yaml:', err);
      return res.status(500).json({ error: `Konnte automations.yaml nicht lesen: ${err.message}` });
    }
    try {
      const automations = yaml.load(data) || [];
      res.json(automations);
    } catch (e) {
      res.status(500).json({ error: 'YAML-Parsing-Fehler: ' + e.message });
    }
  });
});

// API: Einzelne Automatisierung nach ID laden
app.get('/api/automations/:id', (req, res) => {
  fs.readFile(AUTOMATIONS_PATH, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: `Konnte automations.yaml nicht lesen: ${err.message}` });
    }
    try {
      const automations = yaml.load(data) || [];
      const automation = automations.find(a => a.id == req.params.id);
      if (!automation) return res.status(404).json({ error: 'Nicht gefunden' });
      res.json(automation);
    } catch (e) {
      res.status(500).json({ error: 'YAML-Parsing-Fehler: ' + e.message });
    }
  });
});

// API: Automatisierung speichern/aktualisieren
app.put('/api/automations/:id', (req, res) => {
  fs.readFile(AUTOMATIONS_PATH, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: `Konnte automations.yaml nicht lesen: ${err.message}` });
    }
    let automations = [];
    try {
      automations = yaml.load(data) || [];
    } catch (e) {
      return res.status(500).json({ error: 'YAML-Parsing-Fehler: ' + e.message });
    }
    const idx = automations.findIndex(a => a.id == req.params.id);
    if (idx >= 0) {
      automations[idx] = req.body;
    } else {
      automations.push(req.body);
    }
    fs.writeFile(AUTOMATIONS_PATH, yaml.dump(automations), err2 => {
      if (err2) {
        return res.status(500).json({ error: `Konnte automations.yaml nicht speichern: ${err2.message}` });
      }
      res.json({ success: true });
    });
  });
});

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getEntityIdByAutomationId(automationId) {
  // Lade automations.yaml und suche die Automatisierung mit id === automationId
  try {
    const yaml = require('js-yaml');
    const fs = require('fs');
    const data = fs.readFileSync(AUTOMATIONS_PATH, 'utf8');
    const automations = yaml.load(data) || [];
    const automation = automations.find(a => a.id == automationId);
    if (!automation || !automation.alias) return null;
    return 'automation.' + slugify(automation.alias);
  } catch (e) {
    return null;
  }
}

// Automatisierung aktivieren
app.post('/api/automations/:id/start', async (req, res) => {
  if (!HA_TOKEN || !HA_URL) return res.status(500).json({ error: 'HA_TOKEN oder HA_URL nicht gesetzt' });
  const entity_id = getEntityIdByAutomationId(req.params.id);
  if (!entity_id) return res.status(404).json({ error: 'Automatisierung oder alias nicht gefunden' });
  try {
    const result = await axios.post(
      `${HA_URL}/api/services/automation/turn_on`,
      { entity_id },
      { headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    res.json({ success: true, result: result.data });
  } catch (e) {
    console.error('Fehler beim Aktivieren:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// Automatisierung deaktivieren
app.post('/api/automations/:id/stop', async (req, res) => {
  if (!HA_TOKEN || !HA_URL) return res.status(500).json({ error: 'HA_TOKEN oder HA_URL nicht gesetzt' });
  const entity_id = getEntityIdByAutomationId(req.params.id);
  if (!entity_id) return res.status(404).json({ error: 'Automatisierung oder alias nicht gefunden' });
  try {
    const result = await axios.post(
      `${HA_URL}/api/services/automation/turn_off`,
      { entity_id },
      { headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    res.json({ success: true, result: result.data });
  } catch (e) {
    console.error('Fehler beim Deaktivieren:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// Status einer Automatisierung abfragen
app.get('/api/automations/:id/status', async (req, res) => {
  if (!HA_TOKEN || !HA_URL) return res.status(500).json({ error: 'HA_TOKEN oder HA_URL nicht gesetzt' });
  const entity_id = getEntityIdByAutomationId(req.params.id);
  if (!entity_id) return res.status(404).json({ error: 'Automatisierung oder alias nicht gefunden' });
  try {
    const result = await axios.get(
      `${HA_URL}/api/states/${entity_id}`,
      { headers: { Authorization: `Bearer ${HA_TOKEN}` } }
    );
    res.json({ state: result.data.state, attributes: result.data.attributes });
  } catch (e) {
    console.error('Fehler beim Status-Check:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// 2. Toolbox-XMLs (direkt aus /config/www/toolbox)
app.use('/toolbox', express.static('/config/www/toolbox'));

// 3. Statisches Frontend
app.use('/', express.static(path.join(__dirname, '../frontend/build')));

// 4. SPA-Catch-All (ganz am Ende!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Backend läuft auf http://${HOST}:${PORT}`);
  console.log(`scripts.json Pfad: ${SCRIPTS_PATH}`);
  console.log(`HA_TOKEN verfügbar: ${HA_TOKEN ? 'Ja' : 'Nein'}`);
  console.log(`HA_URL: ${HA_URL}`);
  console.log(`Toolbox-Pfad: /config/www/toolbox`);
}); 