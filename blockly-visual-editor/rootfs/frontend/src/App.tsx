import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import BlocklyEditor from './components/BlocklyEditor/BlocklyEditor';
import DebugPanel from './components/DebugPanel/DebugPanel';
import ScriptHeader from './components/ScriptHeader/ScriptHeader';
import Toolbar from './components/Toolbar/Toolbar';
import { DockingLayout, DockingLayoutConfig, DockingPanelConfig } from '@ferdifighter/react-docking-layout';
import '@ferdifighter/react-docking-layout/dist/styles.css';
import '@ferdifighter/react-docking-layout/dist/themes/dark.theme.css';
import '@ferdifighter/react-docking-layout/dist/themes/light.theme.css';
import './App.css';

const App: React.FC = () => {
  const [debugOpen, setDebugOpen] = useState(true);
  const [closedPanels, setClosedPanels] = useState<string[]>([]);

  const handleDebugToggle = () => {
    setDebugOpen(!debugOpen);
  };

  // Panels filtern je nach Sichtbarkeit
  const filterPanels = (panels: DockingPanelConfig[]) => panels.filter(p => !closedPanels.includes(p.id));

  // Die Panel-Konfiguration
  const layoutConfig: DockingLayoutConfig = useMemo(() => ({
    columns: [
      {
        id: 'left',
        width: 300,
        panels: filterPanels([
          {
            id: 'sidebar',
            title: 'Scripts',
            closable: false,
            pinned: true,
            content: <Sidebar />
          }
        ])
      },
      {
        id: 'center',
        panels: filterPanels([
          {
            id: 'main',
            title: 'Blockly Editor',
            closable: false,
            canPin: false,
            hideHeader: true,
            content: (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <ScriptHeader />
                <Toolbar onDebug={handleDebugToggle} />
                <div style={{ flex: 1, minHeight: 0 }}>
                  <BlocklyEditor />
                </div>
              </div>
            )
          },
          ...(debugOpen ? [{
            id: 'debug',
            title: 'Debug',
            closable: true,
            position: 'bottom' as const,
            size: 200,
            resizable: true,
            content: <DebugPanel open={true} onClose={() => setDebugOpen(false)} />
          }] : [])
        ])
      }
    ],
    closedPanels,
    theme: 'dark'
  }), [debugOpen, closedPanels]);

  const handleLayoutChange = (newConfig: DockingLayoutConfig) => {
    // Layout-Änderungen hier verarbeiten falls nötig
  };

  const handlePanelClose = (panelId: string) => {
    if (panelId === 'debug') {
      setDebugOpen(false);
    }
    setClosedPanels(prev => prev.includes(panelId) ? prev : [...prev, panelId]);
  };

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <DockingLayout
        config={layoutConfig}
        onLayoutChange={handleLayoutChange}
        onPanelClose={handlePanelClose}
        closedPanels={closedPanels}
        style={{
          height: '100vh',
          width: '100vw',
        }}
      />
    </div>
  );
};

export default App;
