import React, { useEffect, useState } from 'react';
import './Toolbar.css';

interface ToolbarProps {
  currentAutomationName?: string | null;
  currentAutomationId?: string | null;
  currentAutomationStatus?: 'on' | 'off' | undefined;
  yamlOpen?: boolean;
  onRenameAutomation?: (newName: string) => void;
  onSave?: () => void;
  onCheckBlocks?: () => void;
  onShowCode?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentAutomationName,
  currentAutomationId,
  currentAutomationStatus,
  yamlOpen,
  onRenameAutomation,
  onSave,
  onCheckBlocks,
  onShowCode,
}) => {
  const [automationNameInput, setAutomationNameInput] = useState('');
  const [isEditingAutomationName, setIsEditingAutomationName] = useState(false);

  useEffect(() => {
    setAutomationNameInput(currentAutomationName || '');
  }, [currentAutomationName]);

  const saveName = () => {
    if (onRenameAutomation && automationNameInput.trim()) {
      onRenameAutomation(automationNameInput.trim());
    }
    setIsEditingAutomationName(false);
  };

  const hasAutomation = Boolean(currentAutomationId);
  const displayName = currentAutomationName || 'Neue Automatisierung';

  return (
    <div className="toolbar-blockly">
      <div className="toolbar-title">
        {hasAutomation ? (
          isEditingAutomationName ? (
            <input
              className="toolbar-name-input"
              value={automationNameInput}
              onChange={(event) => setAutomationNameInput(event.target.value)}
              onBlur={saveName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveName();
                if (event.key === 'Escape') setIsEditingAutomationName(false);
              }}
              autoFocus
            />
          ) : (
            <button type="button" className="toolbar-name" onClick={() => setIsEditingAutomationName(true)}>
              {displayName}
            </button>
          )
        ) : (
          <span className="toolbar-name muted">Keine Automatisierung ausgewählt</span>
        )}
        {currentAutomationStatus && (
          <span className={`toolbar-status ${currentAutomationStatus}`}>
            {currentAutomationStatus === 'on' ? 'Aktiv' : 'Gestoppt'}
          </span>
        )}
      </div>
      <div className="toolbar-actions">
        <button className="toolbar-btn primary" onClick={onSave} disabled={!hasAutomation}>
          Speichern
        </button>
        <button className="toolbar-btn" onClick={onCheckBlocks} disabled={!hasAutomation}>
          Blöcke prüfen
        </button>
        <button className={`toolbar-btn ${yamlOpen ? 'active' : ''}`} onClick={onShowCode}>
          YAML
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
