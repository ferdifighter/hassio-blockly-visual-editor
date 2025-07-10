import React from 'react';
import './Toolbar.css';

interface ToolbarProps {
  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  closablePanels: { id: string; title: string }[];
  closedPanels: string[];
  setClosedPanels: (fn: (prev: string[]) => string[]) => void;
  folders?: { id: string; name: string }[];
  currentFolderId?: string;
  onChangeFolder?: (folderId: string) => void;
  currentScriptName?: string | null;
}

const Toolbar: React.FC<ToolbarProps> = ({ theme, setTheme, closablePanels, closedPanels, setClosedPanels, folders = [], currentFolderId, onChangeFolder, currentScriptName }) => (
  <div className="toolbar-blockly">
    <div className="toolbar-row toolbar-row-top-flex">
      <div className="toolbar-top-left">
        <label className="toolbar-label">
          Ordner
          <select
            className="toolbar-select"
            style={{ marginLeft: 4 }}
            value={currentFolderId || ''}
            onChange={e => onChangeFolder && onChangeFolder(e.target.value)}
            disabled={folders.length === 0 || !onChangeFolder}
          >
            {folders.length === 0 && <option value="">common</option>}
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </label>
        {currentScriptName && (
          <span style={{ marginLeft: 12, fontWeight: 500 }}>{currentScriptName}</span>
        )}
      </div>
      <div className="toolbar-top-right">
        <label className="toolbar-label" style={{ marginBottom: 0 }}>
          Theme:
          <select
            className="toolbar-select"
            value={theme}
            onChange={e => setTheme(e.target.value as any)}
            style={{ marginLeft: 8 }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </label>
      </div>
    </div>
    <div className="toolbar-row toolbar-row-bottom-flex">
      <div className="toolbar-bottom-left">
        <button className="toolbar-btn"><span role="img" aria-label="save">💾</span> Save</button>
        <button className="toolbar-btn"><span role="img" aria-label="cancel">✖</span> Cancel</button>
        <button className="toolbar-btn"><span role="img" aria-label="check">✔</span> Check blocks</button>
        <button className="toolbar-btn" disabled>Show code</button>
      </div>
      <div className="toolbar-bottom-right-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap', overflowX: 'auto', minWidth: 0 }}>
          {closablePanels.map(panel => (
            <label key={panel.id} style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-color, inherit)', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={!closedPanels.includes(panel.id)}
                onChange={e => {
                  setClosedPanels(prev =>
                    e.target.checked
                      ? prev.filter(id => id !== panel.id)
                      : [...prev, panel.id]
                  );
                }}
                style={{ marginRight: 6 }}
              />
              {panel.title}
            </label>
          ))}
        </div>
      </div>
    </div>
    <div className="toolbar-row toolbar-row-settings" style={{ display: 'none' }}></div>
  </div>
);

export default Toolbar; 