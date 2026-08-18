const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8099;
const HOST = '0.0.0.0';
const yaml = require('js-yaml');
const axios = require('axios');
require('dotenv').config();
const {
  findMatchingState,
  findPersonForTarget,
  pickDeviceName,
} = require('./notifyNames');
const { simulateAutomation } = require('./simulate');

// Home Assistant Umgebungsvariablen
const SCRIPTS_PATH = '/data/scripts.json';

// Immer /data/scripts.json verwenden
if (!fs.existsSync(SCRIPTS_PATH)) {
  const initialData = {
    id: 'root',
    name: '',
    children: []
  };
  fs.writeFileSync(SCRIPTS_PATH, JSON.stringify(initialData, null, 2));
  console.log('Lege /data/scripts.json an (verschachteltes Objekt-Format mit Root).');
}

// Blockly-Daten Verzeichnis und zentrale Datei
const BLOCKLY_DATA_DIR = '/config/blockly_visual_editor';
const BLOCKLY_DATA_FILE = path.join(BLOCKLY_DATA_DIR, 'blockly_data.json');
const AUTOMATIONS_PATH = '/config/automations.yaml';

// Blockly-Daten Verzeichnis erstellen, falls nicht vorhanden
if (!fs.existsSync(BLOCKLY_DATA_DIR)) {
  fs.mkdirSync(BLOCKLY_DATA_DIR, { recursive: true });
  console.log('Erstelle Blockly-Daten Verzeichnis:', BLOCKLY_DATA_DIR);
}

// Zentrale Blockly-Daten Datei erstellen, falls nicht vorhanden
if (!fs.existsSync(BLOCKLY_DATA_FILE)) {
  const initialBlocklyData = {};
  fs.writeFileSync(BLOCKLY_DATA_FILE, JSON.stringify(initialBlocklyData, null, 2));
  console.log('Lege zentrale Blockly-Daten Datei an:', BLOCKLY_DATA_FILE);
}

// Beim Start: automations.yaml anlegen, falls nicht vorhanden
if (!fs.existsSync(AUTOMATIONS_PATH)) {
  fs.writeFileSync(AUTOMATIONS_PATH, yaml.dump([]));
  console.log('Lege /config/automations.yaml an (leeres Array).');
} else {
  // Prüfe vorhandene Automatisierungen
  try {
    const data = fs.readFileSync(AUTOMATIONS_PATH, 'utf8');
    const automations = yaml.load(data) || [];
    console.log(`Lade ${automations.length} vorhandene Automatisierung(en) aus /config/automations.yaml`);
  } catch (e) {
    console.error('Fehler beim Lesen vorhandener Automatisierungen:', e.message);
  }
}

app.use(express.json());

// CORS für lokale Entwicklung erlauben
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Hilfsfunktionen für zentrale Blockly-Datenverwaltung
function loadBlocklyData() {
  try {
    if (fs.existsSync(BLOCKLY_DATA_FILE)) {
      const data = fs.readFileSync(BLOCKLY_DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Fehler beim Lesen der Blockly-Daten:', e.message);
  }
  return {};
}

function saveBlocklyData(data) {
  try {
    fs.writeFileSync(BLOCKLY_DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('Fehler beim Speichern der Blockly-Daten:', e.message);
    return false;
  }
}

function getBlocklyDataForAutomation(automationId) {
  const allData = loadBlocklyData();
  return allData[automationId] || null;
}

function saveBlocklyDataForAutomation(automationId, blocklyData) {
  const allData = loadBlocklyData();
  allData[automationId] = blocklyData;
  return saveBlocklyData(allData);
}

function deleteBlocklyDataForAutomation(automationId) {
  const allData = loadBlocklyData();
  if (allData[automationId]) {
    delete allData[automationId];
    return saveBlocklyData(allData);
  }
  return true;
}

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

// Hilfsfunktion: Script in der Baumstruktur finden
function findScriptInTree(tree, scriptId) {
  if (tree.id === scriptId) return tree;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findScriptInTree(child, scriptId);
      if (found) return found;
    }
  }
  return null;
}

// Hilfsfunktion: Script in der Baumstruktur aktualisieren
function updateScriptInTree(tree, scriptId, updatedScript) {
  if (tree.id === scriptId) {
    return { ...tree, ...updatedScript };
  }
  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map(child => updateScriptInTree(child, scriptId, updatedScript))
    };
  }
  return tree;
}

// API: Einzelnes Script nach ID laden
app.get('/api/scripts/:id', (req, res) => {
  fs.readFile(SCRIPTS_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Lesen von scripts.json:', err);
      return res.status(500).json({ error: `Konnte scripts.json nicht lesen: ${err.message}` });
    }
    try {
      const tree = JSON.parse(data);
      const script = findScriptInTree(tree, req.params.id);
      if (!script) {
        return res.status(404).json({ error: 'Script nicht gefunden' });
      }
      res.json(script);
    } catch (e) {
      res.status(500).json({ error: 'JSON-Parsing-Fehler: ' + e.message });
    }
  });
});

// API: Einzelnes Script speichern/aktualisieren
app.put('/api/scripts/:id', (req, res) => {
  fs.readFile(SCRIPTS_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Lesen von scripts.json:', err);
      return res.status(500).json({ error: `Konnte scripts.json nicht lesen: ${err.message}` });
    }
    try {
      const tree = JSON.parse(data);
      const updatedTree = updateScriptInTree(tree, req.params.id, req.body);
      
      fs.writeFile(SCRIPTS_PATH, JSON.stringify(updatedTree, null, 2), err2 => {
        if (err2) {
          console.error('Fehler beim Schreiben von scripts.json:', err2);
          return res.status(500).json({ error: `Konnte scripts.json nicht speichern: ${err2.message}` });
        }
        res.json({ success: true });
      });
    } catch (e) {
      res.status(500).json({ error: 'JSON-Parsing-Fehler: ' + e.message });
    }
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
      
      // Füge Blockly-Metadaten hinzu
      const automationsWithBlockly = automations.map(automation => {
        const blocklyData = getBlocklyDataForAutomation(automation.id);
        
        return {
          ...automation,
          hasBlocklyData: !!blocklyData,
          lastBlocklyModified: blocklyData?.lastModified,
          syncedFromHA: blocklyData?.syncedFromHA || false
        };
      });
      
      res.json(automationsWithBlockly);
    } catch (e) {
      res.status(500).json({ error: 'YAML-Parsing-Fehler: ' + e.message });
    }
  });
});

// API: Alle Automatisierungen synchronisieren
app.post('/api/automations/sync', (req, res) => {
  fs.readFile(AUTOMATIONS_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Lesen von automations.yaml:', err);
      return res.status(500).json({ error: `Konnte automations.yaml nicht lesen: ${err.message}` });
    }
    
    try {
      const automations = yaml.load(data) || [];
      let syncedCount = 0;
      
      automations.forEach(automation => {
        const haModified = automation.last_modified || new Date().toISOString();
        
        try {
          const blocklyData = getBlocklyDataForAutomation(automation.id);
          const blocklyModified = blocklyData?.lastModified || '1970-01-01T00:00:00Z';
          
          if (new Date(haModified) > new Date(blocklyModified) && blocklyData) {
            saveBlocklyDataForAutomation(automation.id, {
              ...blocklyData,
              alias: automation.alias,
              lastModified: haModified,
              syncedFromHA: true
            });
            syncedCount++;
            console.log(`Automatisierung ${automation.id} synchronisiert`);
          }
        } catch (e) {
          console.error(`Fehler beim Synchronisieren von ${automation.id}:`, e.message);
        }
      });
      
      res.json({ 
        success: true, 
        message: `${syncedCount} Automatisierung(en) synchronisiert`,
        syncedCount 
      });
    } catch (e) {
      res.status(500).json({ error: 'YAML-Parsing-Fehler: ' + e.message });
    }
  });
});

// API: Einzelne Automatisierung nach ID laden
app.get('/api/automations/:id', (req, res) => {
  fs.readFile(AUTOMATIONS_PATH, 'utf8', (err, yamlData) => {
    if (err) {
      return res.status(500).json({ error: `Konnte automations.yaml nicht lesen: ${err.message}` });
    }

    try {
      const automations = yaml.load(yamlData) || [];
      const haAutomation = automations.find(a => a.id == req.params.id) || {
        id: req.params.id,
        alias: req.params.id,
        description: '',
        mode: 'single',
        triggers: [],
        conditions: [],
        actions: []
      };
      const blockly = getBlocklyDataForAutomation(req.params.id) || {};

      res.json({
        ...haAutomation,
        alias: blockly.alias || haAutomation.alias,
        workspace: blockly.workspace || null,
        xml: blockly.xml || null,
        lastModified: blockly.lastModified || haAutomation.last_modified || null,
        syncedFromHA: blockly.syncedFromHA || false
      });
    } catch (e) {
      res.status(500).json({ error: 'YAML-Parsing-Fehler: ' + e.message });
    }
  });
});

function normalizeAutomationLogic(automation = {}) {
  return {
    triggers: Array.isArray(automation.triggers) ? automation.triggers : (Array.isArray(automation.trigger) ? automation.trigger : []),
    conditions: Array.isArray(automation.conditions) ? automation.conditions : (Array.isArray(automation.condition) ? automation.condition : []),
    actions: Array.isArray(automation.actions) ? automation.actions : (Array.isArray(automation.action) ? automation.action : [])
  };
}

// API: Automatisierung speichern/aktualisieren
app.put('/api/automations/:id', (req, res) => {
  console.log('--- PUT /api/automations/:id ---');
  console.log('ID:', req.params.id);

  const logic = normalizeAutomationLogic(req.body.automation || req.body);
  const blocklyData = {
    id: req.params.id,
    alias: req.body.alias,
    workspace: req.body.workspace || null,
    xml: req.body.xml || null,
    lastModified: new Date().toISOString()
  };

  if (!saveBlocklyDataForAutomation(req.params.id, blocklyData)) {
    console.error('Fehler beim Speichern der Blockly-Daten');
    return res.status(500).json({ error: 'Konnte Blockly-Daten nicht speichern' });
  }

  const haAutomation = {
    id: req.params.id,
    alias: req.body.alias,
    description: req.body.description || '',
    mode: req.body.mode || 'single',
    triggers: logic.triggers,
    conditions: logic.conditions,
    actions: logic.actions
  };

  fs.readFile(AUTOMATIONS_PATH, 'utf8', (err2, data) => {
    if (err2) {
      console.error('Fehler beim Lesen von automations.yaml:', err2);
      return res.status(500).json({ error: `Konnte automations.yaml nicht lesen: ${err2.message}` });
    }
    let automations = [];
    try {
      automations = yaml.load(data) || [];
    } catch (e) {
      console.error('YAML-Parsing-Fehler:', e);
      return res.status(500).json({ error: 'YAML-Parsing-Fehler: ' + e.message });
    }

    const idx = automations.findIndex(a => a.id == req.params.id);
    if (idx >= 0) {
      automations[idx] = haAutomation;
    } else {
      automations.push(haAutomation);
    }

    fs.writeFile(AUTOMATIONS_PATH, yaml.dump(automations), async (err3) => {
      if (err3) {
        console.error('Fehler beim Schreiben von automations.yaml:', err3);
        return res.status(500).json({ error: `Konnte automations.yaml nicht speichern: ${err3.message}` });
      }

      const { HA_TOKEN, HA_URL } = getHACredentials();
      if (HA_TOKEN && HA_URL) {
        try {
          const reloadResult = await axios.post(
            `${HA_URL}/api/services/automation/reload`,
            {},
            { headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' } }
          );
          console.log('Automationen in Home Assistant neu geladen:', reloadResult.data);
        } catch (reloadErr) {
          console.error('Fehler beim Reload der Automationen:', reloadErr.response?.data || reloadErr.message);
        }
      } else {
        console.warn('HA_TOKEN oder HA_URL nicht gesetzt, Automationen werden nicht automatisch neu geladen.');
      }
      res.json({ success: true, automation: haAutomation });
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
    const data = fs.readFileSync(AUTOMATIONS_PATH, 'utf8');
    const automations = yaml.load(data) || [];
    const automation = automations.find(a => a.id == automationId);
    if (!automation || !automation.alias) return null;
    
    // Verwende den Alias direkt als Entity-ID, da Home Assistant den Alias als Entity-ID verwendet
    // Entferne nur problematische Zeichen und ersetze Leerzeichen durch Unterstriche
    const entityId = automation.alias
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '') // Entferne problematische Zeichen
      .replace(/\s+/g, '_') // Ersetze Leerzeichen durch Unterstriche
      .replace(/^_+|_+$/g, ''); // Entferne führende/folgende Unterstriche
    
    return 'automation.' + entityId;
  } catch (e) {
    console.error('Fehler beim Lesen der automations.yaml:', e.message);
    return null;
  }
}

// Hilfsfunktion: Home Assistant API-Credentials ermitteln
function getHACredentials() {
  // Primär den automatischen Supervisor-Token verwenden (sicherer und automatisch)
  let HA_TOKEN = process.env.SUPERVISOR_TOKEN;
  let HA_URL = process.env.SUPERVISOR_URL || 'http://supervisor/core';
  
  console.log('Token-Suche (Supervisor-Priorität):', {
    SUPERVISOR_TOKEN: !!process.env.SUPERVISOR_TOKEN,
    SUPERVISOR_TOKEN_LENGTH: process.env.SUPERVISOR_TOKEN ? process.env.SUPERVISOR_TOKEN.length : 0,
    HASSIO_TOKEN: !!process.env.HASSIO_TOKEN,
    HA_TOKEN: !!process.env.HA_TOKEN,
    hass_token: !!process.env.hass_token
  });
  
  console.log('URL-Suche:', {
    SUPERVISOR_URL: process.env.SUPERVISOR_URL,
    HASSIO_URL: process.env.HASSIO_URL,
    HA_URL: process.env.HA_URL,
    hass_api_url: process.env.hass_api_url
  });
  
  // Fallback: Nur wenn Supervisor-Token nicht verfügbar ist
  if (!HA_TOKEN) {
    console.log('SUPERVISOR_TOKEN nicht verfügbar, versuche Fallback...');
    HA_TOKEN = process.env.HASSIO_TOKEN || process.env.HA_TOKEN || process.env.hass_token;
    HA_URL = process.env.HASSIO_URL || process.env.HA_URL || process.env.hass_api_url || 'http://supervisor/core';
  }
  
  // Wenn immer noch kein Token verfügbar ist
  if (!HA_TOKEN) {
    console.log('Kein Token verfügbar - verwende Ingress ohne Token');
    HA_URL = 'http://supervisor/core';
    HA_TOKEN = null;
  }
  
  console.log('Finale Credentials:', {
    HA_TOKEN: HA_TOKEN ? `gesetzt (Länge: ${HA_TOKEN.length})` : 'nicht gesetzt',
    HA_URL: HA_URL,
    'Verwendeter Token-Typ': HA_TOKEN === process.env.SUPERVISOR_TOKEN ? 'SUPERVISOR_TOKEN' : 
                           HA_TOKEN === process.env.HASSIO_TOKEN ? 'HASSIO_TOKEN' :
                           HA_TOKEN === process.env.HA_TOKEN ? 'HA_TOKEN' :
                           HA_TOKEN === process.env.hass_token ? 'hass_token' : 'kein Token'
  });
  
  return { HA_TOKEN, HA_URL };
}

// Automatisierung aktivieren
app.post('/api/automations/:id/start', async (req, res) => {
  console.log('=== Automatisierung aktivieren ===');
  console.log('ID:', req.params.id);
  
  const { HA_TOKEN, HA_URL } = getHACredentials();
  
  console.log('Verfügbare Umgebungsvariablen:', {
    SUPERVISOR_TOKEN: !!process.env.SUPERVISOR_TOKEN,
    HASSIO_TOKEN: !!process.env.HASSIO_TOKEN,
    HA_TOKEN: !!process.env.HA_TOKEN,
    hass_token: !!process.env.hass_token,
    SUPERVISOR_URL: process.env.SUPERVISOR_URL,
    HASSIO_URL: process.env.HASSIO_URL,
    HA_URL: process.env.HA_URL,
    hass_api_url: process.env.hass_api_url
  });
  
  if (!HA_URL) {
    console.error('Keine gültige Home Assistant URL gefunden');
    return res.status(500).json({ 
      error: 'Home Assistant URL nicht verfügbar',
      available_vars: Object.keys(process.env).filter(key => key.includes('SUPERVISOR') || key.includes('HASSIO') || key.includes('HA_') || key.includes('hass_'))
    });
  }

  const entity_id = getEntityIdByAutomationId(req.params.id);
  console.log('Entity ID:', entity_id);
  
  if (!entity_id) {
    // Fehlerursache genauer ausgeben
    try {
      const data = fs.readFileSync(AUTOMATIONS_PATH, 'utf8');
      const automations = yaml.load(data) || [];
      const automation = automations.find(a => a.id == req.params.id);
      if (!automation) {
        return res.status(404).json({ error: `Automatisierung mit id '${req.params.id}' nicht gefunden.`, automations });
      }
      if (!automation.alias) {
        return res.status(400).json({ error: `Automatisierung mit id '${req.params.id}' hat keinen alias.`, automation });
      }
      return res.status(400).json({ error: `Unbekannter Fehler bei entity_id-Ermittlung.`, automation });
    } catch (e) {
      return res.status(500).json({ error: 'Fehler beim Lesen der automations.yaml: ' + e.message });
    }
  }

  try {
    console.log('Sende Aktivierungs-Request an:', `${HA_URL}/api/services/automation/turn_on`);
    console.log('Entity ID:', entity_id);
    
    const axiosConfig = { headers: { 'Content-Type': 'application/json' } };
    if (HA_TOKEN) axiosConfig.headers['Authorization'] = `Bearer ${HA_TOKEN}`;

    const result = await axios.post(
      `${HA_URL}/api/services/automation/turn_on`,
      { entity_id },
      axiosConfig
    );
    console.log('Aktivierung erfolgreich:', result.data);
    res.json({ success: true, result: result.data });
  } catch (e) {
    console.error('Fehler beim Aktivieren:', e.response?.data || e.message);
    console.error('Response Status:', e.response?.status);
    console.error('Response Headers:', e.response?.headers);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// Automatisierung deaktivieren
app.post('/api/automations/:id/stop', async (req, res) => {
  const { HA_TOKEN, HA_URL } = getHACredentials();
  
  if (!HA_URL) {
    console.error('Keine gültige Home Assistant URL gefunden');
    return res.status(500).json({ 
      error: 'Home Assistant URL nicht verfügbar',
      available_vars: Object.keys(process.env).filter(key => key.includes('SUPERVISOR') || key.includes('HASSIO') || key.includes('HA_') || key.includes('hass_'))
    });
  }
  
  const entity_id = getEntityIdByAutomationId(req.params.id);
  if (!entity_id) {
    try {
      const data = fs.readFileSync(AUTOMATIONS_PATH, 'utf8');
      const automations = yaml.load(data) || [];
      const automation = automations.find(a => a.id == req.params.id);
      if (!automation) {
        return res.status(404).json({ error: `Automatisierung mit id '${req.params.id}' nicht gefunden.`, automations });
      }
      if (!automation.alias) {
        return res.status(400).json({ error: `Automatisierung mit id '${req.params.id}' hat keinen alias.`, automation });
      }
      return res.status(400).json({ error: `Unbekannter Fehler bei entity_id-Ermittlung.`, automation });
    } catch (e) {
      return res.status(500).json({ error: 'Fehler beim Lesen der automations.yaml: ' + e.message });
    }
  }
  try {
    const axiosConfig = { headers: { 'Content-Type': 'application/json' } };
    if (HA_TOKEN) axiosConfig.headers['Authorization'] = `Bearer ${HA_TOKEN}`;

    const result = await axios.post(
      `${HA_URL}/api/services/automation/turn_off`,
      { entity_id },
      axiosConfig
    );
    res.json({ success: true, result: result.data });
  } catch (e) {
    console.error('Fehler beim Deaktivieren:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// Status einer Automatisierung abfragen
app.get('/api/automations/:id/status', async (req, res) => {
  console.log('=== Status abfragen ===');
  console.log('ID:', req.params.id);
  
  try {
    // Debug: Lade alle Automatisierungen
    const data = fs.readFileSync(AUTOMATIONS_PATH, 'utf8');
    const automations = yaml.load(data) || [];
    console.log('Alle Automatisierungen in automations.yaml:', automations.map(a => ({ id: a.id, alias: a.alias })));
    
    const automation = automations.find(a => a.id == req.params.id);
    console.log('Gefundene Automatisierung:', automation);
    
    const { HA_TOKEN, HA_URL } = getHACredentials();
    
    console.log('HA_TOKEN verfügbar:', !!HA_TOKEN);
    console.log('HA_TOKEN Länge:', HA_TOKEN ? HA_TOKEN.length : 0);
    console.log('HA_URL:', HA_URL);
    console.log('Alle Umgebungsvariablen:', Object.keys(process.env).filter(key => key.includes('SUPERVISOR') || key.includes('HASSIO') || key.includes('HA_') || key.includes('hass_')));
    
    if (!HA_URL) {
      console.log('Keine gültige Home Assistant URL gefunden - gebe Fehler zurück');
      return res.status(500).json({ 
        error: 'Home Assistant URL nicht verfügbar',
        available_vars: Object.keys(process.env).filter(key => key.includes('SUPERVISOR') || key.includes('HASSIO') || key.includes('HA_') || key.includes('hass_'))
      });
    }
    
    const entity_id = getEntityIdByAutomationId(req.params.id);
    console.log('Entity ID:', entity_id);
    
    if (!entity_id) {
      if (!automation) {
        return res.status(404).json({ error: `Automatisierung mit id '${req.params.id}' nicht gefunden.`, automations });
      }
      if (!automation.alias) {
        return res.status(400).json({ error: `Automatisierung mit id '${req.params.id}' hat keinen alias.`, automation });
      }
      return res.status(400).json({ error: `Unbekannter Fehler bei entity_id-Ermittlung.`, automation });
    }
    
    console.log('Sende Status-Request an:', `${HA_URL}/api/states/${entity_id}`);
    
    const axiosConfig = { };
    if (HA_TOKEN) axiosConfig.headers = { Authorization: `Bearer ${HA_TOKEN}` };
    const result = await axios.get(
      `${HA_URL}/api/states/${entity_id}`,
      axiosConfig
    );
    console.log('Status erfolgreich abgerufen:', result.data);
    res.json({ state: result.data.state, attributes: result.data.attributes });
  } catch (e) {
    console.error('Fehler beim Status-Check:', e.response?.data || e.message);
    console.error('Response Status:', e.response?.status);
    
    // Wenn die Entity nicht gefunden wird (404), bedeutet das, dass die Automatisierung
    // noch nicht in Home Assistant registriert ist. Das ist normal nach dem Speichern.
    if (e.response && e.response.status === 404) {
      // Automatisierung existiert in automations.yaml aber noch nicht in Home Assistant
      // Gebe einen Standard-Status zurück
      return res.json({ state: 'off', attributes: { 
        friendly_name: 'Automatisierung wird geladen...',
        status: 'not_loaded'
      }});
    }
    
    // Für andere Fehler gebe den ursprünglichen Fehler zurück
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// Alle Entitäten abrufen
app.get('/api/entities', async (req, res) => {
  console.log('=== Alle Entitäten abrufen ===');
  
  const { HA_TOKEN, HA_URL } = getHACredentials();
  
  if (!HA_URL) {
    console.error('Keine gültige Home Assistant URL gefunden');
    return res.status(500).json({ 
      error: 'Home Assistant URL nicht verfügbar',
      available_vars: Object.keys(process.env).filter(key => key.includes('SUPERVISOR') || key.includes('HASSIO') || key.includes('HA_') || key.includes('hass_'))
    });
  }
  
  try {
    console.log('Sende Entitäten-Request an:', `${HA_URL}/api/states`);
    
    const axiosConfig = { };
    if (HA_TOKEN) axiosConfig.headers = { Authorization: `Bearer ${HA_TOKEN}` };
    const result = await axios.get(
      `${HA_URL}/api/states`,
      axiosConfig
    );
    
    // Entitäten nach Typ gruppieren und formatieren
    const entities = result.data.map(entity => ({
      entity_id: entity.entity_id,
      state: entity.state,
      friendly_name: entity.attributes?.friendly_name || entity.entity_id,
      domain: entity.entity_id.split('.')[0],
      device_class: entity.attributes?.device_class || null,
      unit_of_measurement: entity.attributes?.unit_of_measurement || null,
      options: Array.isArray(entity.attributes?.options)
        ? entity.attributes.options
        : Array.isArray(entity.attributes?.hvac_modes)
          ? entity.attributes.hvac_modes
          : null
    }));
    
    console.log(`Erfolgreich ${entities.length} Entitäten abgerufen`);
    res.json(entities);
  } catch (e) {
    console.error('Fehler beim Abrufen der Entitäten:', e.response?.data || e.message);
    console.error('Response Status:', e.response?.status);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// Companion-App-Smartphones und zugeordnete Personen
app.get('/api/notify-targets', async (req, res) => {
  const { HA_TOKEN, HA_URL } = getHACredentials();
  if (!HA_URL) {
    return res.status(500).json({ error: 'Home Assistant URL nicht verfügbar' });
  }

  try {
    const axiosConfig = {};
    if (HA_TOKEN) axiosConfig.headers = { Authorization: `Bearer ${HA_TOKEN}` };

    const [statesResult, servicesResult] = await Promise.all([
      axios.get(`${HA_URL}/api/states`, axiosConfig),
      axios.get(`${HA_URL}/api/services`, axiosConfig)
    ]);

    const states = Array.isArray(statesResult.data) ? statesResult.data : [];
    const persons = states.filter((entity) => entity.entity_id.startsWith('person.'));

    const notifyDomain = (servicesResult.data || []).find((entry) => entry.domain === 'notify');
    const services = notifyDomain?.services || {};
    const mobileServices = Object.entries(services)
      .filter(([name]) => name.startsWith('mobile_app_'))
      .map(([name, meta]) => ({
        serviceName: name,
        service: `notify.${name}`,
        name: meta && meta.name
      }));

    const targets = mobileServices.map((svc) => {
      const objectId = svc.serviceName.replace(/^mobile_app_/, '');
      const tracker = findMatchingState(states, ['device_tracker.'], objectId);
      const notifyEntity = findMatchingState(states, ['notify.'], svc.serviceName)
        || findMatchingState(states, ['notify.'], objectId);

      const deviceName = pickDeviceName({
        serviceName: svc.serviceName,
        serviceMetaName: svc.name,
        tracker,
        notifyEntity,
      });
      const person = findPersonForTarget({
        persons,
        states,
        objectId,
        tracker,
        deviceName,
      });
      const personName = person?.attributes?.friendly_name || null;

      return {
        service: svc.service,
        device_name: deviceName,
        person_id: person?.entity_id || null,
        person_name: personName,
        label: personName ? `${personName} · ${deviceName}` : deviceName
      };
    });

    targets.sort((a, b) => a.label.localeCompare(b.label, 'de'));
    res.json(targets);
  } catch (e) {
    console.error('Fehler beim Abrufen der Companion-Geräte:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

app.get('/api/services', async (req, res) => {
  const { HA_TOKEN, HA_URL } = getHACredentials();
  if (!HA_URL) {
    return res.status(500).json({ error: 'Home Assistant URL nicht verfügbar' });
  }

  try {
    const axiosConfig = {};
    if (HA_TOKEN) axiosConfig.headers = { Authorization: `Bearer ${HA_TOKEN}` };
    const result = await axios.get(`${HA_URL}/api/services`, axiosConfig);
    const domains = Array.isArray(result.data) ? result.data : [];
    const services = [];

    for (const entry of domains) {
      const domain = entry?.domain;
      const domainServices = entry?.services || {};
      if (!domain || typeof domainServices !== 'object') {
        continue;
      }
      for (const [name, meta] of Object.entries(domainServices)) {
        services.push({
          service: `${domain}.${name}`,
          domain,
          name: (meta && meta.name) || name.replace(/_/g, ' '),
          description: (meta && meta.description) || ''
        });
      }
    }

    services.sort((a, b) => a.service.localeCompare(b.service, 'de'));
    res.json(services);
  } catch (e) {
    console.error('Fehler beim Abrufen der Services:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

function haAxiosConfig(token) {
  const axiosConfig = { headers: { 'Content-Type': 'application/json' } };
  if (token) {
    axiosConfig.headers.Authorization = `Bearer ${token}`;
  }
  return axiosConfig;
}

function haErrorMessage(error) {
  const data = error.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (data && typeof data === 'object') {
    return data.message || data.error || JSON.stringify(data);
  }
  return error.message || String(error);
}

app.post('/api/simulate', async (req, res) => {
  const automation = {
    alias: req.body.alias || 'Simulation',
    triggers: Array.isArray(req.body.triggers) ? req.body.triggers : [],
    conditions: Array.isArray(req.body.conditions) ? req.body.conditions : [],
    actions: Array.isArray(req.body.actions) ? req.body.actions : [],
  };

  const { HA_TOKEN, HA_URL } = getHACredentials();
  if (!HA_URL) {
    return res.status(500).json({ error: 'Home Assistant URL nicht verfügbar' });
  }

  const axiosConfig = haAxiosConfig(HA_TOKEN);
  let statesList = [];
  const services = {};
  let now = new Date();

  try {
    const statesResult = await axios.get(`${HA_URL}/api/states`, axiosConfig);
    statesList = Array.isArray(statesResult.data) ? statesResult.data : [];
  } catch (error) {
    return res.status(500).json({ error: `Zustände konnten nicht gelesen werden: ${haErrorMessage(error)}` });
  }

  try {
    const servicesResult = await axios.get(`${HA_URL}/api/services`, axiosConfig);
    const domains = Array.isArray(servicesResult.data) ? servicesResult.data : [];
    for (const item of domains) {
      const domain = item?.domain;
      const domainServices = item?.services || {};
      if (!domain || typeof domainServices !== 'object') {
        continue;
      }
      for (const [name, meta] of Object.entries(domainServices)) {
        services[`${domain}.${name}`] = meta || {};
      }
    }
  } catch (error) {
    console.warn('Dienste für die Simulation nicht verfügbar:', haErrorMessage(error));
  }

  try {
    const nowResult = await axios.post(
      `${HA_URL}/api/template`,
      { template: '{{ now().isoformat() }}' },
      axiosConfig,
    );
    const raw = typeof nowResult.data === 'string' ? nowResult.data : String(nowResult.data ?? '');
    const parsed = new Date(raw.replace(/^"|"$/g, ''));
    if (!Number.isNaN(parsed.getTime())) {
      now = parsed;
    }
  } catch (error) {
    console.warn('Home-Assistant-Zeit nicht verfügbar, nutze lokale Zeit:', haErrorMessage(error));
  }

  const stateMap = {};
  for (const entity of statesList) {
    if (entity?.entity_id) {
      stateMap[entity.entity_id] = entity;
    }
  }

  try {
    const result = await simulateAutomation(automation, {
      now,
      states: stateMap,
      services,
      renderTemplate: async (template) => {
        const tpl = String(template || '').trim();
        if (!tpl) {
          return '';
        }
        const body = tpl.includes('{{') ? tpl : `{{ ${tpl} }}`;
        const response = await axios.post(`${HA_URL}/api/template`, { template: body }, axiosConfig);
        if (typeof response.data === 'string') {
          return response.data;
        }
        return JSON.stringify(response.data);
      },
      callQueryService: async (call) => {
        const [domain, service] = String(call.action || '').split('.');
        if (!domain || !service) {
          throw new Error(`Ungültiger Dienst: ${call.action}`);
        }
        const payload = {};
        if (call.target?.entity_id) {
          payload.entity_id = call.target.entity_id;
        }
        if (call.data && typeof call.data === 'object') {
          Object.assign(payload, call.data);
        }
        const response = await axios.post(
          `${HA_URL}/api/services/${domain}/${service}?return_response`,
          payload,
          axiosConfig,
        );
        return response.data;
      },
    });
    res.json(result);
  } catch (error) {
    console.error('Simulation fehlgeschlagen:', error);
    res.status(500).json({ error: haErrorMessage(error) });
  }
});

app.use('/', express.static(path.join(__dirname, '../frontend/build')));

// 4. SPA-Catch-All (ganz am Ende!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Backend läuft auf http://${HOST}:${PORT}`);
  console.log(`scripts.json Pfad: ${SCRIPTS_PATH}`);
  console.log(`Blockly-Daten Verzeichnis: ${BLOCKLY_DATA_DIR}`);
  console.log(`automations.yaml Pfad: ${AUTOMATIONS_PATH}`);
}); 