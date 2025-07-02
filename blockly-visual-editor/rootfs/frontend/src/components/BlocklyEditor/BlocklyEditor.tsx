import React, { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';

const toolbox = {
  "kind": "flyoutToolbox",
  "contents": [
    { "kind": "block", "type": "controls_if" },
    { "kind": "block", "type": "logic_compare" },
    { "kind": "block", "type": "math_number" },
    { "kind": "block", "type": "text" }
  ]
};

const BlocklyEditor: React.FC = () => {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  useEffect(() => {
    if (blocklyDiv.current) {
      workspaceRef.current = Blockly.inject(blocklyDiv.current, {
        toolbox,
        theme: DarkTheme,
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
    }
    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
      }
    };
  }, []);

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