import React, { useState, useEffect } from 'react';
import './Toolbar.css';

interface ToolbarProps {
  closablePanels: { id: string; title: string }[];
  closedPanels: string[];
  setClosedPanels: (fn: (prev: string[]) => string[]) => void;
  folders?: { id: string; name: string }[];
  currentFolderId?: string;
  onChangeFolder?: (folderId: string) => void;
  currentAutomationName?: string | null;
  currentAutomationStatus?: 'on' | 'off' | undefined;
  onRenameAutomation?: (newName: string) => void;
  onSave?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  closablePanels, 
  closedPanels, 
  setClosedPanels, 
  folders = [], 
  currentFolderId, 
  onChangeFolder, 
  currentAutomationName,
  currentAutomationStatus,
  onRenameAutomation,
  onSave
}) => {
  const [automationNameInput, setAutomationNameInput] = useState<string>('');
  const [isEditingAutomationName, setIsEditingAutomationName] = useState<boolean>(false);

  // Aktualisiere das Eingabefeld, wenn sich der Automatisierungsname ändert
  useEffect(() => {
    setAutomationNameInput(currentAutomationName || '');
  }, [currentAutomationName]);

  const handleAutomationNameSave = () => {
    if (onRenameAutomation && automationNameInput.trim()) {
      onRenameAutomation(automationNameInput.trim());
      setIsEditingAutomationName(false);
    }
  };

  const handleAutomationNameCancel = () => {
    setAutomationNameInput(currentAutomationName || '');
    setIsEditingAutomationName(false);
  };

  const handleAutomationNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAutomationNameSave();
    } else if (e.key === 'Escape') {
      handleAutomationNameCancel();
    }
  };

  return (
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
          {currentAutomationName && (
            <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              {isEditingAutomationName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text"
                    value={automationNameInput}
                    onChange={e => setAutomationNameInput(e.target.value)}
                    onKeyDown={handleAutomationNameKeyDown}
                    onBlur={handleAutomationNameSave}
                    style={{
                      fontSize: 14,
                      fontFamily: 'monospace',
                      background: '#333',
                      color: '#fff',
                      border: '1px solid #555',
                      borderRadius: 3,
                      padding: '2px 6px',
                      minWidth: 120
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleAutomationNameSave}
                    style={{
                      background: '#4CAF50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      padding: '2px 6px',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                    title="Speichern"
                  >
                    ✓
                  </button>
                  <button
                    onClick={handleAutomationNameCancel}
                    style={{
                      background: '#f44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      padding: '2px 6px',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                    title="Abbrechen"
                  >
                    ✗
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 500, minWidth: 120 }}>{currentAutomationName}</span>
                  {currentAutomationStatus && (
                    <span style={{ 
                      fontSize: 11, 
                      color: currentAutomationStatus === 'on' ? '#4ecdc4' : '#f39c12',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: currentAutomationStatus === 'on' ? 'rgba(78, 205, 196, 0.1)' : 'rgba(243, 156, 18, 0.1)',
                      border: `1px solid ${currentAutomationStatus === 'on' ? '#4ecdc4' : '#f39c12'}`
                    }}>
                      {currentAutomationStatus === 'on' ? '▶️ Läuft' : '⏸️ Gestoppt'}
                    </span>
                  )}
                  <button
                    onClick={() => setIsEditingAutomationName(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#aaa',
                      cursor: 'pointer',
                      padding: 2,
                      fontSize: 12
                    }}
                    title="Umbenennen"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="toolbar-top-right">
          {/* Theme-Auswahl entfernt */}
        </div>
      </div>
      <div className="toolbar-row toolbar-row-bottom-flex">
        <div className="toolbar-bottom-left">
          <button className="toolbar-btn" onClick={onSave}><span role="img" aria-label="save">💾</span> Speichern</button>
          <button className="toolbar-btn"><span role="img" aria-label="cancel">✖</span> Abbrechen</button>
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
};

export default Toolbar; 