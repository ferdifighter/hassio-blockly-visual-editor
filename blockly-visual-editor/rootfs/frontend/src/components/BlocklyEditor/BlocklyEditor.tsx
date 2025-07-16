import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';
import { registerAllHomeAssistantBlocks } from './blocks';
import { EntityField } from './blocks/EntityField';
registerAllHomeAssistantBlocks();

// Zusätzlicher Import für textToDom und domToText
const textToDom = Blockly.utils?.xml?.textToDom;
const domToText = Blockly.utils?.xml?.domToText;

// Eigenes LightTheme mit explizitem Hintergrund
const LightTheme = Blockly.Theme.defineTheme('light', {
  name: 'light',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#fff',
    toolboxBackgroundColour: '#f5f5f5',
    flyoutBackgroundColour: '#f5f5f5',
  }
});

interface BlocklyEditorProps {
  theme: 'light' | 'dark' | 'auto';
  automationId?: string | null;
  onSave?: () => Promise<void>;
  onCancel?: () => void;
}

const BlocklyEditor = forwardRef<any, BlocklyEditorProps>(({ theme, automationId, onSave, onCancel }, ref) => {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [toolboxXml, setToolboxXml] = useState<string | null>(null);
  const [automation, setAutomation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [automationName, setAutomationName] = useState<string>('');

  // Automatisierungsnamen aus der Automatisierung oder aus dem Workspace holen
  useEffect(() => {
    if (automation && automation.alias) {
      setAutomationName(automation.alias);
    } else if (automationId) {
      setAutomationName(automationId);
    }
  }, [automation, automationId]);

  // Sprache und Toolbox dynamisch bestimmen
  useEffect(() => {
    // Sprache statisch setzen (z.B. 'de' oder 'en')
    const lang = 'de'; // oder 'en' als Fallback
    const fallbackToolboxXml = `
<xml id="toolbox" style="display: none">
  <category name="Logik" colour="#8E24AA">
    <block type="controls_if"></block>
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_negate"></block>
  </category>
  <category name="Mathematik" colour="#4CAF50">
    <block type="math_number"></block>
    <block type="math_arithmetic"></block>
  </category>
</xml>
`;
    async function loadToolboxXml() {
      const base = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
      const url = `${base}toolbox/${lang}/toolbox_main.xml`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const xml = await res.text();
        if (xml.trim().startsWith('<!DOCTYPE html') || xml.trim().startsWith('<html')) {
          throw new Error('Toolbox-XML nicht gefunden - HTML-Seite erhalten');
        }
        console.log('Toolbox erfolgreich geladen:', url);
        setToolboxXml(xml);
      } catch (error) {
        console.warn('Fehler beim Laden der Toolbox, verwende Fallback:', error);
        setToolboxXml(fallbackToolboxXml);
      }
    }
    loadToolboxXml();
  }, []);

  // Automatisierung laden, wenn automationId sich ändert
  useEffect(() => {
    if (!automationId) return;
    setLoading(true);
    
    const apiUrl = getApiUrl(`api/scripts/${automationId}`);
    console.log('Lade Automatisierung:', automationId, 'von URL:', apiUrl);
    
    // Zuerst Automatisierungs-Info aus scripts.json laden
    fetch(apiUrl)
      .then(res => {
        console.log('API Response Status:', res.status, res.statusText);
        if (!res.ok) {
          // Automatisierung existiert noch nicht - das ist normal bei neuen Automatisierungen
          console.log('Automatisierung existiert noch nicht, erstelle neue Automatisierung');
          const newAutomation = {
            id: automationId,
            alias: automationId, // Wird später durch den Namen ersetzt
            description: '',
            trigger: [],
            condition: [],
            action: [],
            mode: 'single'
          };
          setAutomation(newAutomation);
          if (workspaceRef.current) {
            workspaceRef.current.clear();
          }
          return null; // Keine weiteren API-Aufrufe nötig
        }
        return res.json();
      })
      .then(scriptData => {
        if (!scriptData) return; // Automatisierung war neu, bereits behandelt
        
        // Dann versuchen, die Automatisierung aus automations.yaml zu laden
        const automationUrl = getApiUrl(`api/automations/${automationId}`);
        console.log('Lade Automatisierung von URL:', automationUrl);
        
        return fetch(automationUrl)
          .then(res => {
            console.log('Automatisierung API Response Status:', res.status, res.statusText);
            if (!res.ok) {
              // Keine Automatisierung vorhanden - erstelle eine neue
              console.log('Erstelle neue Automatisierung für:', automationId);
              const newAutomation = {
                id: automationId,
                alias: scriptData.name || automationId,
                description: '',
                trigger: [],
                condition: [],
                action: [],
                mode: 'single'
              };
              return newAutomation;
            }
            return res.json();
          })
          .then(automationData => {
            console.log('Automatisierung geladen/erstellt:', automationData);
            setAutomation(automationData);
            // Blockly-XML importieren
            if (workspaceRef.current) {
              workspaceRef.current.clear();
              if (automationData.xml) {
                try {
                  const dom = textToDom(automationData.xml);
                  Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
                  console.log('Blockly-XML erfolgreich importiert');
                } catch (e) {
                  console.warn('Fehler beim Importieren des Blockly-XML:', e);
                }
              } else {
                console.log('Keine XML-Daten vorhanden, leeres Workspace');
              }
            } else {
              console.warn('Workspace nicht verfügbar');
            }
          });
      })
      .catch((error) => {
        console.warn('Fehler beim Laden der Automatisierung:', error);
        // Erstelle eine neue Automatisierung bei Fehlern
        const newAutomation = {
          id: automationId,
          alias: automationId,
          description: '',
          trigger: [],
          condition: [],
          action: [],
          mode: 'single'
        };
        setAutomation(newAutomation);
        if (workspaceRef.current) {
          workspaceRef.current.clear();
        }
      })
      .finally(() => setLoading(false));
  }, [automationId]);

  // Hilfsfunktion: entity_id aus Alias generieren (Slugify wie im Backend)
  function slugify(str: string) {
    return str
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // Alias-Validierung und entity_id-Vorschau
  const [aliasWarning, setAliasWarning] = useState<string | null>(null);
  const [entityIdPreview, setEntityIdPreview] = useState<string>('');

  // Synchronisiere Alias mit Automatisierungsnamen
  useEffect(() => {
    if (automation && automation.alias !== automationName) {
      setAutomation((prev: any) => prev ? { ...prev, alias: automationName } : prev);
    }
  }, [automationName]);

  // Alias-Validierung und Vorschau
  useEffect(() => {
    if (automation && automation.alias) {
      const alias = automation.alias.trim();
      const slug = slugify(alias);
      setEntityIdPreview(slug ? `automation.${slug}` : '');
      if (!alias || !slug) {
        setAliasWarning('Alias darf nicht leer sein und muss mindestens einen Buchstaben oder eine Zahl enthalten.');
      } else {
        setAliasWarning(null);
      }
    } else {
      setEntityIdPreview('');
      setAliasWarning(null);
    }
  }, [automation?.alias]);

  // Speichern-Logik als Funktion exportieren
  const handleSave = async () => {
    const xmlDom = Blockly.Xml.workspaceToDom(workspaceRef.current!);
    const xmlText = domToText(xmlDom);
    console.log('handleSave aufgerufen', {
      automationId,
      automation,
      xmlText
    });
    if (!automationId || !workspaceRef.current) return;
    const alias = automationName.trim();
    const slug = slugify(alias);
    if (!alias || !slug) {
      setAliasWarning('Alias darf nicht leer sein und muss mindestens einen Buchstaben oder eine Zahl enthalten.');
      return;
    }
    if (automation && automation.alias !== alias) {
      alert('Achtung: Wenn du den Namen änderst, ändert sich auch die entity_id! (entity_id: ' + `automation.${slug}` + ')');
    }
    const newAutomation = {
      ...(automation || { id: automationId }),
      id: automationId,
      alias: alias,
      xml: xmlText,
    };
    setLoading(true);
    
    // Speichere die Automatisierung in automations.yaml
    await fetch(getApiUrl(`api/automations/${automationId}`),
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAutomation)
      }
    );
    
    setAutomation(newAutomation);
    setLoading(false);
  };

  // Wenn onSave gesetzt ist, übergebe handleSave
  useEffect(() => {
    if (onSave) {
      onSaveRef.current = handleSave;
    }
  }, [onSave, handleSave]);
  const onSaveRef = useRef<() => Promise<void>>(handleSave);

  // Theme-Auswahl
  const getBlocklyTheme = () => {
    if (theme === 'dark') return DarkTheme;
    if (theme === 'light') return LightTheme;
    if (theme === 'auto') {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return DarkTheme;
      }
      return LightTheme;
    }
    return LightTheme;
  };

  // Initialisierung + Theme-Wechsel mit Block-Erhalt
  useEffect(() => {
    if (!blocklyDiv.current || !toolboxXml) return;
    // Blöcke sichern
    let xml = '';
    if (workspaceRef.current) {
      const dom = Blockly.Xml.workspaceToDom(workspaceRef.current);
      xml = Blockly.Xml.domToText(dom);
      workspaceRef.current.dispose();
      workspaceRef.current = null;
    }
    // Toolbox als XML-DOM parsen
    let toolboxDom: Element | undefined = undefined;
    if (textToDom && toolboxXml) {
      toolboxDom = textToDom(toolboxXml);
    }
    // Neues Workspace mit aktuellem Theme und Toolbox
    workspaceRef.current = Blockly.inject(blocklyDiv.current, {
      toolbox: toolboxDom,
      theme: getBlocklyTheme(),
      grid: {
        spacing: 20,
        length: 3,
        colour: '#555',
        snap: true
      },
      trashcan: true,
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2
      }
    });
    // Blöcke wiederherstellen
    if (xml && textToDom) {
      const dom = textToDom(xml);
      Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
    }
    // Nach Initialisierung: Resize
    setTimeout(() => {
      if (workspaceRef.current) {
        Blockly.svgResize(workspaceRef.current);
      }
    }, 0);
    // Cleanup handled by next effect run
    // eslint-disable-next-line
  }, [theme, toolboxXml, automationId]);

  // ResizeObserver für dynamische Anpassung
  useEffect(() => {
    if (!blocklyDiv.current || !workspaceRef.current) return;
    const observer = new window.ResizeObserver(() => {
      Blockly.svgResize(workspaceRef.current!);
    });
    observer.observe(blocklyDiv.current);
    return () => observer.disconnect();
  }, []);

  // Leere den Workspace, wenn keine Automatisierung ausgewählt ist
  useEffect(() => {
    if (automationId === null && workspaceRef.current) {
      workspaceRef.current.clear();
    }
  }, [automationId]);

  useImperativeHandle(ref, () => ({
    handleSave
  }));

  if (!automationId) {
    return <div style={{ color: '#888', textAlign: 'center', padding: 32 }}>Keine Automatisierung ausgewählt</div>;
  }

  if (!toolboxXml) {
    return <div>Lade Blockly-Toolbox…</div>;
  }

  return (
    <section style={{ display: 'flex', flex: 1, width: '100%', height: '100%' }}>
      <div ref={blocklyDiv} id="blocklyDiv" style={{ height: '100%', width: '100%' }} />
    </section>
  );
});

export default BlocklyEditor;

// Exportiere handleSave für die Toolbar
export const getBlocklySaveFunction = (ref: React.RefObject<any>) => ref.current?.handleSave; 

// Hilfsfunktion für API-URL (dynamisch für verschiedene Umgebungen)
const getApiUrl = (endpoint: string) => {
  console.log('getApiUrl Debug:', {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    host: window.location.host,
    pathname: window.location.pathname,
    endpoint
  });
  
  // Für lokale Entwicklung (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const url = `http://localhost:8099/${endpoint.replace(/^\//, '')}`;
    console.log('Lokale Entwicklung - URL:', url);
    return url;
  }
  
  // Für Home Assistant Ingress
  // Der Ingress-Pfad ist bereits im pathname enthalten, also verwende den gleichen Host
  const base = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
  const url = `${window.location.protocol}//${window.location.host}${base}${endpoint.replace(/^\//, '')}`;
  console.log('Home Assistant Ingress - URL:', url);
  return url;
}; 