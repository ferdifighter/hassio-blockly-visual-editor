import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';
import { registerAllHomeAssistantBlocks } from './blocks';
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
  scriptId?: string | null;
  onSave?: () => Promise<void>;
  onCancel?: () => void;
}

const BlocklyEditor = forwardRef<any, BlocklyEditorProps>(({ theme, scriptId, onSave, onCancel }, ref) => {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [toolboxXml, setToolboxXml] = useState<string | null>(null);
  const [automation, setAutomation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scriptName, setScriptName] = useState<string>('');

  // Scriptnamen aus der Automatisierung oder aus dem Workspace holen
  useEffect(() => {
    if (automation && automation.alias) {
      setScriptName(automation.alias);
    } else if (scriptId) {
      setScriptName(scriptId);
    }
  }, [automation, scriptId]);

  // Sprache und Toolbox dynamisch bestimmen
  useEffect(() => {
    // Sprache statisch setzen (z.B. 'system', 'de' oder 'en')
    const lang = 'system'; // oder 'de'/'en' als Fallback
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
        const xml = await res.text();
        if (xml.trim().startsWith('<!DOCTYPE html') || xml.trim().startsWith('<html')) {
          throw new Error('Toolbox-XML nicht gefunden');
        }
        setToolboxXml(xml);
      } catch {
        setToolboxXml(fallbackToolboxXml);
      }
    }
    loadToolboxXml();
  }, []);

  // Automatisierung laden, wenn scriptId sich ändert
  useEffect(() => {
    if (!scriptId) return;
    setLoading(true);
    fetch(getApiUrl(`api/automations/${scriptId}`))
      .then(res => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(data => {
        setAutomation(data);
        // Blockly-XML importieren
        if (workspaceRef.current) {
          workspaceRef.current.clear();
          if (data.xml) {
            try {
              const dom = textToDom(data.xml);
              Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
            } catch (e) {
              console.warn('Fehler beim Importieren des Blockly-XML:', e);
            }
          }
        }
      })
      .catch(() => {
        // Noch keine Automatisierung vorhanden
        setAutomation(null);
        if (workspaceRef.current) workspaceRef.current.clear();
      })
      .finally(() => setLoading(false));
  }, [scriptId]);

  // Speichern-Logik als Funktion exportieren
  const handleSave = async () => {
    if (!scriptId || !workspaceRef.current) return;
    const xmlDom = Blockly.Xml.workspaceToDom(workspaceRef.current);
    const xmlText = domToText(xmlDom);
    const newAutomation = {
      ...(automation || { id: scriptId }),
      id: scriptId,
      alias: scriptName || scriptId,
      xml: xmlText,
    };
    setLoading(true);
    await fetch(getApiUrl(`api/automations/${scriptId}`),
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
  }, [theme, toolboxXml]);

  // ResizeObserver für dynamische Anpassung
  useEffect(() => {
    if (!blocklyDiv.current || !workspaceRef.current) return;
    const observer = new window.ResizeObserver(() => {
      Blockly.svgResize(workspaceRef.current!);
    });
    observer.observe(blocklyDiv.current);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    handleSave
  }));

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

// Hilfsfunktion für API-URL (wie in Sidebar)
const getApiUrl = (endpoint: string) => {
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return `http://localhost:8099/${endpoint.replace(/^\//, '')}`;
  }
  const base = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
  return `${base}${endpoint.replace(/^\//, '')}`;
}; 