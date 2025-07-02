const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Home Assistant API Konfiguration
const HASS_API_URL = process.env.HASS_API_URL || 'http://supervisor/core/api';
const HASS_TOKEN = process.env.HASS_TOKEN || process.env.SUPERVISOR_TOKEN;

// WebSocket Server für Echtzeit-Updates
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    console.log('WebSocket Client verbunden');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('WebSocket Nachricht erhalten:', data);
            
            // Hier können wir Echtzeit-Updates an alle Clients senden
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        } catch (error) {
            console.error('Fehler beim Verarbeiten der WebSocket Nachricht:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket Client getrennt');
    });
});

// API Routes
app.get('/api/automations', async (req, res) => {
    try {
        const response = await axios.get(`${HASS_API_URL}/config/automation/config`, {
            headers: {
                'Authorization': `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Fehler beim Abrufen der Automatisierungen:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Automatisierungen' });
    }
});

app.post('/api/automations', async (req, res) => {
    try {
        const response = await axios.post(`${HASS_API_URL}/config/automation/config`, req.body, {
            headers: {
                'Authorization': `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Fehler beim Erstellen der Automatisierung:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen der Automatisierung' });
    }
});

app.get('/api/entities', async (req, res) => {
    try {
        const response = await axios.get(`${HASS_API_URL}/states`, {
            headers: {
                'Authorization': `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Fehler beim Abrufen der Entities:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Entities' });
    }
});

// Hauptroute
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
const server = app.listen(PORT, () => {
    console.log(`Blockly Visual Editor läuft auf Port ${PORT}`);
    console.log(`Home Assistant API URL: ${HASS_API_URL}`);
});

// WebSocket Server an HTTP Server anhängen
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
}); 