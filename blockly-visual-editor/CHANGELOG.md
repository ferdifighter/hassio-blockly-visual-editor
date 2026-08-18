# Changelog

## 0.6.4

- Personen werden im Dialog „Benachrichtigung senden an“ wieder den Smartphones zugeordnet

## 0.6.3

- Schrift auf hellen Textblöcken ist schwarz und wieder lesbar
- Eingabefelder und Dropdowns sind wieder rund und modern, die 3D-Blöcke bleiben

## 0.6.2

- Blöcke rasten früher und über eine größere Distanz ein; das Raster zieht sie nicht mehr vom Anschluss weg
- Eingerastete Blöcke heben sich durch abgerundete 3D-Kanten ab, ähnlich wie in ioBroker Blockly

## 0.6.1

- „erstelle Text aus“ zeigt die einzelnen Teile untereinander, damit der Block nicht in die Breite wächst

## 0.6.0

- Logik wie in ioBroker Blockly: Vergleich (= ≠ < ≤ > ≥), und/oder, nicht, wahr/falsch, falls/mache
- Mathematik: Zahl, rechnen, in Zahl umwandeln
- Text allgemein: Text erstellen, Länge, enthält, ist leer – ohne spezielle Vorlagen
- Vergleiche können als Bedingung oder im Falls-Block verwendet werden

## 0.5.0

- Textbausteine: festen Text, Entitätszustand, Attribute und Variablen zu einer Nachricht zusammensetzen
- Telegram- und Alexa-Blöcke (Integrationen müssen in Home Assistant installiert sein)
- Companion-App kann denselben Textbaustein senden
- Bedingungen für Anwesenheit im Raum und „noch nicht gemeldet“
- Aktion „als gemeldet speichern“ verhindert, dass Alexa dieselbe Meldung ständig wiederholt

## 0.4.2

- Ordner- und Script-Icons auf derselben Ebene stehen wieder untereinander

## 0.4.1

- Automatisierungen können wieder aus einem Ordner auf die gleiche Ebene wie der Ordner gezogen werden

## 0.4.0

- Protokollfenster lässt sich ein- und ausblenden
- Schaltfläche „Testen“ prüft die Automatisierung gegen den aktuellen Home-Assistant-Stand
- Verbindungen zu Entitäten, Bedingungen und Abfragen (z. B. Integrationen wie Bierfinder) erscheinen im Protokoll
- Schaltende Aktionen werden nur beschrieben, nicht ausgeführt

## 0.3.9

- Speichern, Blöcke prüfen und YAML stehen rechts in der Kopfzeile
- Icon und Titel haben Abstand zum oberen Rand und zur Home-Assistant-Sidebar

## 0.3.8

- Kopfzeile ist eine Zeile: App-Name und Automatisierung links, Aktionen rechts

## 0.3.7

- Löschen einer Automatisierung fragt nicht mehr nach „Ordner löschen“
- Die Anzahl in einem Ordner überdeckt das Ordner-Icon nicht mehr, Aufklappen bleibt möglich

## 0.3.6

- Oberfläche an Home Assistant angeglichen: klarere Flächen, abgerundete Panels, moderne Buttons
- Sidebar mit Überschrift, besserer Suche und aufgeräumten Aktionen
- Toolbar mit App-Kennzeichnung und Icons, Dialoge und Hinweise einheitlicher

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
