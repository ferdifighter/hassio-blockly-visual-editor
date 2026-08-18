# Home Assistant Add-on: Blockly Visual Editor

**Aktuelle Version: 0.6.2**

Visueller Editor für Home-Assistant-Automatisierungen auf Basis von [Google Blockly](https://developers.google.com/blockly).

Statt YAML von Hand zu schreiben, setzt du Blöcke zusammen. Das Add-on erzeugt daraus eine echte Home-Assistant-Automatisierung und schreibt sie nach `automations.yaml`.

## Was ist neu in 0.6.2

- Blöcke docken leichter an, ohne lange über die Anschlussstelle zu fahren
- Eingerastete Blöcke haben abgerundete 3D-Kanten und stehen klarer voneinander ab

## Was ist neu in 0.6.1

- Der Block „erstelle Text aus“ stapelt die Textteile untereinander statt in einer langen Zeile

## Was ist neu in 0.6.0

- Allgemeine Logik-Blöcke wie in ioBroker: Vergleich, und/oder, nicht, wahr/falsch
- Text und Mathematik ohne spezielle Vorlagen, kombinierbar mit Entitäten

## Was ist neu in 0.5.0

- Texte aus Bausteinen, Entitäten und Variablen zusammensetzen
- Telegram, Companion-App und Alexa können dieselbe Nachricht senden
- Anwesenheit im Raum und „nur einmal melden“, damit Alexa nicht ständig wiederholt

## Was ist neu in 0.4.2

- Ordner- und Script-Icons auf derselben Ebene sind wieder ausgerichtet

## Was ist neu in 0.4.1

- Automatisierungen lassen sich aus einem Ordner wieder auf die oberste Ebene ziehen

## Was ist neu in 0.4.0

- Schaltfläche **Testen** prüft die Blöcke gegen den aktuellen Home-Assistant-Stand
- **Protokoll** blendet ein Fenster ein, in dem Verbindungen, Bedingungen und Abfrageergebnisse stehen
- Integrationen mit Rückgabewert (z. B. Bierfinder) zeigen ihr Ergebnis; Lichter und Schalter werden nicht wirklich geschaltet

## Was ist neu in 0.3.9

- Kopfzeile: Name links, Aktionen rechts, Abstand zum Rand

## Was ist neu in 0.3.8

- Kopfzeile in einer Zeile: Name links, Speichern/YAML rechts

## Was ist neu in 0.3.7

- Löschdialog unterscheidet Automatisierung und Ordner
- Ordner-Zähler liegt neben dem Namen und verdeckt das Icon nicht mehr

## Was ist neu in 0.3.6

- Modernere Oberfläche mit Panels, Icons und klarerer Sidebar
- Funktionen unverändert: Speichern, YAML, Blöcke, Auswahldialoge

## Was ist neu in 0.3.5

- Smartphone-Namen im Benachrichtigungsdialog werden nicht mehr verdoppelt

## Was ist neu in 0.3.4

## Was ist neu in 0.3.3

- Neue Automatisierungen werden sofort ausgewählt, Speichern ist danach aktiv
- Bereits gesetzte Blöcke bleiben beim Anlegen erhalten

## Was ist neu in 0.3.0

- Offizielle Blockly-JSON-Serialisierung statt Legacy-XML
- JSON-Toolbox und JSON-Blockdefinitionen
- Eigener Blockly-Generator für Home-Assistant-YAML (`triggers` / `conditions` / `actions`)
- Zelos-Renderer, Theme-Wechsel ohne Workspace-Verlust
- Speichern und Laden über die moderne Blockly-API

## Features

- Drag-and-Drop-Editor in der Home-Assistant-Seitenleiste
- Trigger, Bedingungen, Aktionen, Geräte und Logik als Blöcke
- Entity-Auswahl aus deiner Home-Assistant-Instanz
- YAML-Vorschau der erzeugten Automatisierung
- Ordner, Umbenennen, Drag & Drop in der Sidebar

## Installation

1. Dieses Repository zu den Home-Assistant-Add-on-Repositories hinzufügen
2. Add-on installieren und starten
3. Panel **Blockly Editor** in der Seitenleiste öffnen

## Entwicklung

- Frontend: React + Vite + Blockly
- Backend: Express, schreibt `/config/automations.yaml` und Blockly-Zustand nach `/config/blockly_visual_editor/`

```bash
cd blockly-visual-editor/rootfs/frontend
npm install
npm test
npm run build
```

## Lizenz

MIT License
