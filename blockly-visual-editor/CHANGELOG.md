# Changelog

## 0.3.5

- Smartphone-Namen im Benachrichtigungsdialog werden nicht mehr verdoppelt
- Anzeigename kommt von Gerät/Entität, nicht vom internen Notify-Dienstnamen

## 0.3.4

- Entitäten werden mit ihrem Anzeigenamen statt der Entity-ID dargestellt
- Auswahldialoge für Entitäten, Services, Zustände und Ereignisse
- Uhrzeit-, Datums- und Dauerfelder statt freier Texteingabe
- Wochentage können per Auswahl gesetzt werden

## 0.3.3

- Neue Automatisierungen werden sofort ausgewählt, damit Speichern aktiv ist
- Blöcke auf dem Canvas bleiben erhalten, wenn eine neue Automatisierung angelegt wird
- Speichern und Blockprüfung hängen an der Automatisierungs-ID, nicht nur am Namen

## 0.3.2

- Benachrichtigungen gehen an Smartphones mit Home Assistant Companion App
- Im Block „Benachrichtigung senden“ können Person und Gerät ausgewählt werden

## 0.3.1

- Editor-Layout wie bei ioBroker: Scriptbaum links, Blockly-Workspace nutzt die volle Restbreite
- Docking-Layout entfernt, das den Editor zusammengedrückt und den Workspace leer gelassen hat
- Blockly wird erst injiziert, wenn der Container eine echte Größe hat, und skaliert bei Resize mit

## 0.3.0

- Blockly auf die aktuelle Google-API umgestellt (JSON-Serialisierung, JSON-Toolbox, JSON-Blöcke)
- Eigener Generator erzeugt Home-Assistant-YAML (`triggers`, `conditions`, `actions`)
- Speichern und Laden der Automatisierungen repariert
- YAML-Vorschau und Blockprüfung im Editor
- Frontend-Build mit Vite, Add-on-Image baut das Frontend selbst

## 0.2.9

- Entity-Auswahl und Serialisierung
- Home-Assistant-API über Supervisor-Token
- Sidebar, Ordner und Editor-UX
