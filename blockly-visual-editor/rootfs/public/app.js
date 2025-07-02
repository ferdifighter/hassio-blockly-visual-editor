class BlocklyVisualEditor {
    constructor() {
        this.workspace = null;
        this.websocket = null;
        this.entities = [];
        this.automations = [];
        
        this.init();
    }
    
    async init() {
        this.setupWebSocket();
        this.setupBlockly();
        this.setupEventListeners();
        await this.loadData();
    }
    
    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            this.updateConnectionStatus(true);
            console.log('WebSocket Verbindung hergestellt');
        };
        
        this.websocket.onclose = () => {
            this.updateConnectionStatus(false);
            console.log('WebSocket Verbindung getrennt');
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket Fehler:', error);
            this.updateConnectionStatus(false);
        };
        
        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Fehler beim Verarbeiten der WebSocket Nachricht:', error);
            }
        };
    }
    
    setupBlockly() {
        // Blockly Workspace erstellen
        this.workspace = Blockly.inject('blocklyDiv', {
            toolbox: this.createToolbox(),
            scrollbars: true,
            trashcan: true,
            grid: {
                spacing: 20,
                length: 3,
                colour: '#ccc',
                snap: true
            },
            zoom: {
                controls: true,
                wheel: true,
                startScale: 1.0,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.2
            },
            move: {
                scrollbars: true,
                drag: true,
                wheel: true
            }
        });
        
        // Blockly Events
        this.workspace.addChangeListener((event) => {
            if (event.type === Blockly.Events.BLOCK_CHANGE ||
                event.type === Blockly.Events.BLOCK_CREATE ||
                event.type === Blockly.Events.BLOCK_DELETE) {
                this.updateStatus('Workspace geändert');
            }
        });
    }
    
    createToolbox() {
        return {
            kind: 'categoryToolbox',
            contents: [
                {
                    kind: 'category',
                    name: 'Home Assistant',
                    colour: 230,
                    contents: [
                        {
                            kind: 'block',
                            type: 'hass_trigger',
                            text: 'Trigger: [TRIGGER]',
                            fields: {
                                TRIGGER: {
                                    type: 'field_dropdown',
                                    options: [
                                        ['State Change', 'state'],
                                        ['Time', 'time'],
                                        ['Event', 'event']
                                    ]
                                }
                            }
                        },
                        {
                            kind: 'block',
                            type: 'hass_action',
                            text: 'Action: [ACTION]',
                            fields: {
                                ACTION: {
                                    type: 'field_dropdown',
                                    options: [
                                        ['Turn On', 'turn_on'],
                                        ['Turn Off', 'turn_off'],
                                        ['Set State', 'set_state']
                                    ]
                                }
                            }
                        },
                        {
                            kind: 'block',
                            type: 'hass_entity',
                            text: 'Entity: [ENTITY]',
                            fields: {
                                ENTITY: {
                                    type: 'field_input',
                                    text: 'light.living_room'
                                }
                            }
                        }
                    ]
                },
                {
                    kind: 'category',
                    name: 'Logic',
                    colour: 210,
                    contents: [
                        {
                            kind: 'block',
                            type: 'controls_if'
                        },
                        {
                            kind: 'block',
                            type: 'logic_compare'
                        },
                        {
                            kind: 'block',
                            type: 'logic_operation'
                        }
                    ]
                },
                {
                    kind: 'category',
                    name: 'Variables',
                    colour: 330,
                    custom: 'VARIABLE'
                }
            ]
        };
    }
    
    setupEventListeners() {
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveAutomation();
        });
        
        document.getElementById('loadBtn').addEventListener('click', () => {
            this.loadAutomation();
        });
        
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportAutomation();
        });
    }
    
    async loadData() {
        try {
            // Entities laden
            const entitiesResponse = await fetch('/api/entities');
            this.entities = await entitiesResponse.json();
            this.renderEntities();
            
            // Automatisierungen laden
            const automationsResponse = await fetch('/api/automations');
            this.automations = await automationsResponse.json();
            this.renderAutomations();
            
            this.updateStatus('Daten geladen');
        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
            this.updateStatus('Fehler beim Laden der Daten');
        }
    }
    
    renderEntities() {
        const entitiesList = document.getElementById('entitiesList');
        entitiesList.innerHTML = '';
        
        this.entities.forEach(entity => {
            const entityDiv = document.createElement('div');
            entityDiv.className = 'entity-item';
            entityDiv.textContent = entity.entity_id;
            entityDiv.title = entity.state;
            
            entityDiv.addEventListener('click', () => {
                this.insertEntityBlock(entity.entity_id);
            });
            
            entitiesList.appendChild(entityDiv);
        });
    }
    
    renderAutomations() {
        const automationsList = document.getElementById('automationsList');
        automationsList.innerHTML = '';
        
        this.automations.forEach(automation => {
            const automationDiv = document.createElement('div');
            automationDiv.className = 'automation-item';
            automationDiv.textContent = automation.alias || automation.id;
            
            automationDiv.addEventListener('click', () => {
                this.loadAutomationById(automation.id);
            });
            
            automationsList.appendChild(automationDiv);
        });
    }
    
    insertEntityBlock(entityId) {
        const block = this.workspace.newBlock('hass_entity');
        block.getField('ENTITY').setValue(entityId);
        
        const position = this.workspace.getMetrics().viewHeight / 2;
        block.moveBy(100, position);
        this.workspace.addBlock(block);
    }
    
    async saveAutomation() {
        try {
            const code = Blockly.JavaScript.workspaceToCode(this.workspace);
            const xml = Blockly.Xml.workspaceToDom(this.workspace);
            const xmlText = Blockly.Xml.domToText(xml);
            
            const automation = {
                alias: 'Blockly Automation',
                description: 'Erstellt mit Blockly Visual Editor',
                trigger: this.parseTriggers(code),
                action: this.parseActions(code),
                mode: 'single'
            };
            
            const response = await fetch('/api/automations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(automation)
            });
            
            if (response.ok) {
                this.updateStatus('Automatisierung gespeichert');
                await this.loadData(); // Automatisierungen neu laden
            } else {
                throw new Error('Fehler beim Speichern');
            }
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            this.updateStatus('Fehler beim Speichern');
        }
    }
    
    parseTriggers(code) {
        // Einfache Trigger-Parsing-Logik
        const triggers = [];
        
        if (code.includes('state')) {
            triggers.push({
                platform: 'state',
                entity_id: 'all'
            });
        }
        
        if (code.includes('time')) {
            triggers.push({
                platform: 'time',
                at: '00:00:00'
            });
        }
        
        return triggers;
    }
    
    parseActions(code) {
        // Einfache Action-Parsing-Logik
        const actions = [];
        
        if (code.includes('turn_on')) {
            actions.push({
                service: 'homeassistant.turn_on',
                target: {
                    entity_id: 'all'
                }
            });
        }
        
        if (code.includes('turn_off')) {
            actions.push({
                service: 'homeassistant.turn_off',
                target: {
                    entity_id: 'all'
                }
            });
        }
        
        return actions;
    }
    
    loadAutomation() {
        // Implementierung für das Laden von Automatisierungen
        this.updateStatus('Lade Automatisierung...');
    }
    
    loadAutomationById(id) {
        // Implementierung für das Laden einer spezifischen Automatisierung
        this.updateStatus(`Lade Automatisierung ${id}...`);
    }
    
    exportAutomation() {
        const xml = Blockly.Xml.workspaceToDom(this.workspace);
        const xmlText = Blockly.Xml.domToText(xml);
        
        const blob = new Blob([xmlText], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'automation.xml';
        a.click();
        
        URL.revokeObjectURL(url);
        this.updateStatus('Automatisierung exportiert');
    }
    
    handleWebSocketMessage(data) {
        // WebSocket Nachrichten verarbeiten
        console.log('WebSocket Nachricht erhalten:', data);
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = connected ? 'Verbunden' : 'Getrennt';
        statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('statusText');
        statusElement.textContent = message;
        
        // Status nach 3 Sekunden zurücksetzen
        setTimeout(() => {
            statusElement.textContent = 'Bereit';
        }, 3000);
    }
}

// Anwendung starten
document.addEventListener('DOMContentLoaded', () => {
    new BlocklyVisualEditor();
}); 