import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DockingLayout, DockingLayoutConfig } from '@ferdifighter/react-docking-layout';
import '@ferdifighter/react-docking-layout/dist/styles.css';
import '@ferdifighter/react-docking-layout/dist/themes/dark.theme.css';
import '@ferdifighter/react-docking-layout/dist/themes/light.theme.css';
import './App.css';
import BlocklyEditor, { BlocklyEditorHandle } from './components/BlocklyEditor/BlocklyEditor';
import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Sidebar/Sidebar';

const App: React.FC = () => {
  const [closedPanels, setClosedPanels] = useState<string[]>([]);
  const [theme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(null);
  const [yamlPreview, setYamlPreview] = useState('');
  const blocklyEditorRef = useRef<BlocklyEditorHandle>(null);

  const [toolbarData, setToolbarData] = useState<{
    folders: { id: string; name: string }[];
    currentFolderId: string | null;
    currentAutomationName: string | null;
    currentAutomationId: string | null;
    currentAutomationStatus: 'on' | 'off' | undefined;
    moveAutomationToFolder: (folderId: string) => void;
  }>({
    folders: [],
    currentFolderId: null,
    currentAutomationName: null,
    currentAutomationId: null,
    currentAutomationStatus: undefined,
    moveAutomationToFolder: () => {},
  });

  const layoutConfig: DockingLayoutConfig = useMemo(
    () => ({
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
                      currentAutomationName: data.currentAutomationName,
                      currentAutomationId: data.currentAutomationId,
                      currentAutomationStatus: data.currentAutomationStatus,
                      moveAutomationToFolder: data.moveAutomationToFolder,
                    });
                    setSelectedAutomationId(data.currentAutomationId);
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
              content: (
                <Toolbar
                  closablePanels={[{ id: 'yaml', title: 'YAML' }]}
                  closedPanels={closedPanels}
                  setClosedPanels={setClosedPanels}
                  folders={toolbarData.folders}
                  currentFolderId={toolbarData.currentFolderId || ''}
                  onChangeFolder={toolbarData.moveAutomationToFolder}
                  currentAutomationName={toolbarData.currentAutomationName}
                  currentAutomationStatus={toolbarData.currentAutomationStatus}
                  onSave={() => blocklyEditorRef.current?.handleSave()}
                  onCheckBlocks={() => blocklyEditorRef.current?.checkBlocks()}
                  onShowCode={() => {
                    blocklyEditorRef.current?.showCode();
                    setClosedPanels((prev) => prev.filter((id) => id !== 'yaml'));
                  }}
                />
              ),
            },
            {
              id: 'editor',
              title: 'Editor',
              closable: false,
              canPin: false,
              hideHeader: true,
              contentPadding: 0,
              content: (
                <BlocklyEditor
                  ref={blocklyEditorRef}
                  theme={theme}
                  automationId={selectedAutomationId}
                  automationName={toolbarData.currentAutomationName}
                  onYamlChange={setYamlPreview}
                />
              ),
            },
            {
              id: 'yaml',
              title: 'YAML',
              closable: true,
              position: 'bottom',
              size: 220,
              resizable: true,
              pinned: true,
              contentPadding: 0,
              content: (
                <pre className="yaml-preview">
                  {yamlPreview || '# Wähle eine Automatisierung und setze Blöcke.'}
                </pre>
              ),
            },
          ],
        },
      ],
      closedPanels,
      theme,
    }),
    [closedPanels, selectedAutomationId, theme, toolbarData, yamlPreview],
  );

  useEffect(() => {
    const root = document.body;
    root.classList.remove('theme-light', 'theme-dark');
    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      root.classList.add(mq.matches ? 'theme-dark' : 'theme-light');
      const onChange = (event: MediaQueryListEvent) => {
        root.classList.remove('theme-light', 'theme-dark');
        root.classList.add(event.matches ? 'theme-dark' : 'theme-light');
      };
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    root.classList.add(`theme-${theme}`);
    return undefined;
  }, [theme]);

  return (
    <DockingLayout
      config={layoutConfig}
      onPanelClose={(panelId: string) => {
        setClosedPanels((prev) => (prev.includes(panelId) ? prev : [...prev, panelId]));
      }}
      closedPanels={closedPanels}
      style={{
        height: '100vh',
        width: '100vw',
      }}
    />
  );
};

export default App;
