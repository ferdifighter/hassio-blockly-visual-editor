import React, { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';

// Zusätzlicher Import für textToDom
// @ts-ignore
const textToDom = Blockly.utils?.xml?.textToDom;

const toolbox = {
  "kind": "flyoutToolbox",
  "contents": [
    { "kind": "block", "type": "controls_if" },
    { "kind": "block", "type": "logic_compare" },
    { "kind": "block", "type": "math_number" },
    { "kind": "block", "type": "text" }
  ]
};

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
    if (!blocklyDiv.current) return;
    // Blöcke sichern
    let xml = '';
    if (workspaceRef.current) {
      const dom = Blockly.Xml.workspaceToDom(workspaceRef.current);
      xml = Blockly.Xml.domToText(dom);
      workspaceRef.current.dispose();
      workspaceRef.current = null;
    }
    // Neues Workspace mit aktuellem Theme
    workspaceRef.current = Blockly.inject(blocklyDiv.current, {
      toolbox,
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
  }, [theme]);

  // ResizeObserver für dynamische Anpassung
  useEffect(() => {
    if (!blocklyDiv.current || !workspaceRef.current) return;
    const observer = new window.ResizeObserver(() => {
      Blockly.svgResize(workspaceRef.current!);
    });
    observer.observe(blocklyDiv.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section style={{ display: 'flex', flex: 1, width: '100%', height: '100%' }}>
      <div ref={blocklyDiv} id="blocklyDiv" style={{ height: '100%', width: '100%' }} />
    </section>
  );
};

export default BlocklyEditor; 