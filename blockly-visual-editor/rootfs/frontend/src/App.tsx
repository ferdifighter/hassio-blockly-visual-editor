import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DockingLayout, DockingLayoutConfig, DockingPanelConfig } from '@ferdifighter/react-docking-layout';
import '@ferdifighter/react-docking-layout/dist/styles.css';
import '@ferdifighter/react-docking-layout/dist/themes/dark.theme.css';
import '@ferdifighter/react-docking-layout/dist/themes/light.theme.css';
import './App.css';
import BlocklyEditor from './components/BlocklyEditor/BlocklyEditor';
import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Sidebar/Sidebar';


const App: React.FC = () => {
  const [closedPanels, setClosedPanels] = useState<string[]>(['outline', 'problems']);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const blocklyEditorRef = useRef<any>(null);

  // Theme wird standardmäßig auf 'auto' gesetzt
  // Die Addon-Konfiguration wird nicht mehr verwendet, da /api/addon/config nicht existiert

  // State für Toolbar-Daten aus Sidebar
  const [toolbarData, setToolbarData] = useState<{
    folders: { id: string; name: string }[];
    currentFolderId: string | null;
    currentScriptName: string | null;
    currentScriptId: string | null;
    moveScriptToFolder: (folderId: string) => void;
  }>({ 
    folders: [], 
    currentFolderId: null, 
    currentScriptName: null, 
    currentScriptId: null,
    moveScriptToFolder: () => {}
  });

  const getClosablePanels = (config: DockingLayoutConfig): { id: string; title: string }[] => {
    const result: { id: string; title: string }[] = [];
    config.columns.forEach(col => {
      col.panels.forEach(panel => {
        if (panel.id !== 'toolbox' && panel.closable !== false) {
          result.push({ id: panel.id, title: panel.title });
        }
      });
    });
    return result;
  };

  // Panels, die immer als Checkbox angezeigt werden sollen
  const allPanels = [
    { id: 'output', title: 'Output' },
    { id: 'terminal', title: 'Terminal' },
    { id: 'outline', title: 'Outline' },
    { id: 'problems', title: 'Problems' },
  ];

  const [layoutConfig, setLayoutConfig] = useState<DockingLayoutConfig>({
    columns: [
      {
        id: 'left',
        width: 300,
        panels: [
          {
            id: 'explorer',
            title: 'Explorer',
            closable: false,
            pinned: true,
            hideHeader: true,
            content: (
              <Sidebar 
                onSelectionChange={(data) => {
                  setToolbarData({
                    folders: data.folders,
                    currentFolderId: data.currentFolderId,
                    currentScriptName: data.currentScriptName,
                    currentScriptId: data.currentScriptId,
                    moveScriptToFolder: data.moveScriptToFolder
                  });
                  // Script-Auswahl übernehmen
                  setSelectedScriptId(data.currentScriptId);
                }}
              />
            ),
          },     
        ],
      },
      {
        id: 'center',
        panels: [
          {
            id: 'toolbar',
            title: 'Toolbar',
            closable: false,
            canPin: false,
            hideHeader: true,
            resizable: false,
            size: 100,
            content: null, // Wird unten gesetzt
          },
          {
            id: 'editor',
            title: 'Editor',
            closable: false,
            canPin: false,
            hideHeader: true,
            contentPadding: 0,
            content: (
              <BlocklyEditor theme={theme} scriptId={selectedScriptId} />
            ),
          },
          {
            id: 'output',
            title: 'Output',
            closable: true,
            position: 'bottom',
            size: 200,
            resizable: true,
            pinned: true,
            content: (
              <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                <div>✅ Anwendung gestartet</div>
                <div>📦 Dependencies geladen</div>
                <div>🚀 React Docking Layout bereit</div>
              </div>
            ),
          },
          {
            id: 'terminal',
            title: 'Terminal',
            closable: true,
            position: 'bottom',
            size: 200,
            resizable: true,
            pinned: false,
            contentPadding: 8, // Weniger Padding für Terminal
            content: (
              <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                <div>user@host:~$ echo Hallo Welt</div>
                <div>Hallo Welt</div>
              </div>
            ),
          },
        ],
      },
      {
        id: 'right',
        width: 260,
        panels: [
          {
            id: 'outline',
            title: 'Outline',
            closable: true,
            pinned: true,
            contentPadding: 16, // Mehr Padding für Outline
            content: (
              <div>
                <h3>Outline</h3>
                <ul>
                  <li>Section 1</li>
                  <li>Section 2</li>
                  <li>Section 3</li>
                </ul>
              </div>
            ),
          },
          {
            id: 'problems',
            title: 'Problems',
            closable: true,
            pinned: true,
            content: (
              <div>
                <h3>Problems</h3>
                <div style={{ color: '#ff6b6b' }}>❌ 2 Fehler gefunden</div>
                <div style={{ color: '#ff6b6b' }}>⚠️ 1 Warnung</div>
              </div>
            ),
          },
        ],
      },
    ],
    closedPanels,
    theme,
  });

  const closablePanels = allPanels;
  layoutConfig.columns[1].panels[0].content = (
    <Toolbar
      closablePanels={closablePanels}
      closedPanels={closedPanels}
      setClosedPanels={setClosedPanels}
      folders={toolbarData.folders}
      currentFolderId={toolbarData.currentFolderId || ''}
      onChangeFolder={toolbarData.moveScriptToFolder}
      currentScriptName={toolbarData.currentScriptName}
      onSave={() => blocklyEditorRef.current?.handleSave()}
    />
  );

  layoutConfig.columns[1].panels[1].content = (
    <BlocklyEditor ref={blocklyEditorRef} theme={theme} scriptId={selectedScriptId} />
  );

  const handleLayoutChange = (newConfig: DockingLayoutConfig) => {
    setLayoutConfig(newConfig);
  };

  const handlePanelClose = (panelId: string) => {
    setClosedPanels(prev => prev.includes(panelId) ? prev : [...prev, panelId]);
  };

  React.useEffect(() => {
    const root = document.body;
    root.classList.remove('theme-light', 'theme-dark');
    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      root.classList.add(mq.matches ? 'theme-dark' : 'theme-light');
    } else {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  return (
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
  );
};

export default App;
