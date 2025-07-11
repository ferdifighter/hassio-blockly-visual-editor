const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8099;
const HOST = '0.0.0.0';

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

// 2. Toolbox-XMLs
app.use('/toolbox', express.static(path.join(__dirname, '../frontend/public/toolbox')));

// 3. Statisches Frontend
app.use('/', express.static(path.join(__dirname, '../frontend/build')));

// 4. SPA-Catch-All (ganz am Ende!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Backend läuft auf http://${HOST}:${PORT}`);
  console.log(`scripts.json Pfad: ${SCRIPTS_PATH}`);
}); 