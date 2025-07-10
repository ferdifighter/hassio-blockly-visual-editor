const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 5000;

// Flexible Pfadwahl: ENV > Add-on > lokal
const SCRIPTS_PATH = process.env.SCRIPTS_PATH || (process.env.IS_ADDON ? '/data/scripts.json' : path.join(__dirname, 'scripts.json'));

app.use(express.json());

// CORS für lokale Entwicklung erlauben
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// GET: Scripte laden
app.get('/api/scripts', (req, res) => {
  fs.readFile(SCRIPTS_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Lesen von scripts.json:', err);
      return res.status(500).json({ error: `Konnte scripts.json nicht lesen (${SCRIPTS_PATH}).` });
    }
    res.json(JSON.parse(data));
  });
});

// PUT: Scripte speichern
app.put('/api/scripts', (req, res) => {
  fs.writeFile(SCRIPTS_PATH, JSON.stringify(req.body, null, 2), err => {
    if (err) {
      console.error('Fehler beim Schreiben von scripts.json:', err);
      return res.status(500).json({ error: `Konnte scripts.json nicht speichern (${SCRIPTS_PATH}).` });
    }
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
  console.log(`scripts.json Pfad: ${SCRIPTS_PATH}`);
}); 