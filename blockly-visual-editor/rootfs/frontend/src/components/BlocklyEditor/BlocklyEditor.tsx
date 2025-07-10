import React, { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';
import { registerAllHomeAssistantBlocks } from './blocks';
registerAllHomeAssistantBlocks();

// Zusätzlicher Import für textToDom
// @ts-ignore
const textToDom = Blockly.utils?.xml?.textToDom;

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
}

const BlocklyEditor: React.FC<BlocklyEditorProps> = ({ theme }) => {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [toolboxXml, setToolboxXml] = useState<string | null>(null);

  // Sprache und Toolbox dynamisch bestimmen
  useEffect(() => {
    async function getAddonLanguage() {
      try {
        const res = await fetch('/api/addon/config');
        const config = await res.json();
        return config.sprache || 'system';
      } catch {
        return 'system';
      }
    }
    async function getSystemLanguage() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        return data.language && data.language.startsWith('de') ? 'de' : 'en';
      } catch {
        return 'en';
      }
    }
    async function getEffectiveLanguage() {
      const addonLang = await getAddonLanguage();
      if (addonLang === 'system') {
        return await getSystemLanguage();
      }
      return addonLang;
    }
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
      const lang = await getEffectiveLanguage();
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

  if (!toolboxXml) {
    return <div>Lade Blockly-Toolbox…</div>;
  }

  return (
    <section style={{ display: 'flex', flex: 1, width: '100%', height: '100%' }}>
      <div ref={blocklyDiv} id="blocklyDiv" style={{ height: '100%', width: '100%' }} />
    </section>
  );
};

export default BlocklyEditor; 