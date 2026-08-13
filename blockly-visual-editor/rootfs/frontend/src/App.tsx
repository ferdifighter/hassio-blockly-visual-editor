import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import BlocklyEditor, { BlocklyEditorHandle } from './components/BlocklyEditor/BlocklyEditor';
import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Sidebar/Sidebar';

const App: React.FC = () => {
  const [theme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(null);
  const [yamlPreview, setYamlPreview] = useState('');
  const [yamlOpen, setYamlOpen] = useState(false);
  const blocklyEditorRef = useRef<BlocklyEditorHandle>(null);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

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

  useEffect(() => {
    const root = document.body;
    const apply = (dark: boolean) => {
      root.classList.remove('theme-light', 'theme-dark');
      root.classList.add(dark ? 'theme-dark' : 'theme-light');
      setResolvedTheme(dark ? 'dark' : 'light');
    };

    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const onChange = (event: MediaQueryListEvent) => apply(event.matches);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    apply(theme === 'dark');
    return undefined;
  }, [theme]);

  return (
    <div className={`app-shell theme-${resolvedTheme}`}>
      <header className="app-toolbar">
        <Toolbar
          currentAutomationName={toolbarData.currentAutomationName}
          currentAutomationId={toolbarData.currentAutomationId}
          currentAutomationStatus={toolbarData.currentAutomationStatus}
          yamlOpen={yamlOpen}
          onSave={() => blocklyEditorRef.current?.handleSave()}
          onCheckBlocks={() => blocklyEditorRef.current?.checkBlocks()}
          onShowCode={() => {
            blocklyEditorRef.current?.showCode();
            setYamlOpen((open) => !open);
          }}
        />
      </header>
      <div className="app-body">
        <aside className="app-sidebar">
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
        </aside>
        <section className="app-main">
          <div className="app-workspace">
            <BlocklyEditor
              ref={blocklyEditorRef}
              theme={theme}
              automationId={selectedAutomationId}
              automationName={toolbarData.currentAutomationName}
              onYamlChange={setYamlPreview}
            />
          </div>
          {yamlOpen && (
            <div className="app-yaml">
              <div className="app-yaml-header">
                <span>YAML</span>
                <button type="button" onClick={() => setYamlOpen(false)} aria-label="YAML schließen">
                  ×
                </button>
              </div>
              <pre>{yamlPreview || '# Wähle eine Automatisierung und setze Blöcke.'}</pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default App;
