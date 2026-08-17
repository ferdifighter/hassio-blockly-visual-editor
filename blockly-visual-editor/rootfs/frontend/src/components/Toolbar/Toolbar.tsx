import React, { useEffect, useState } from 'react';
import { FaCode, FaFloppyDisk, FaListCheck, FaPuzzlePiece } from 'react-icons/fa6';
import './Toolbar.css';

const FaPuzzlePieceIcon = FaPuzzlePiece as React.ComponentType<{ size?: number }>;
const FaFloppyDiskIcon = FaFloppyDisk as React.ComponentType<{ size?: number }>;
const FaListCheckIcon = FaListCheck as React.ComponentType<{ size?: number }>;
const FaCodeIcon = FaCode as React.ComponentType<{ size?: number }>;

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
    <>
      <div className="toolbar-left">
        <div className="toolbar-brand">
          <span className="toolbar-logo" aria-hidden="true">
            <FaPuzzlePieceIcon size={15} />
          </span>
          <span className="toolbar-brand-name">Blockly Editor</span>
        </div>
        <span className="toolbar-separator" aria-hidden="true" />
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
              <button type="button" className="toolbar-name" onClick={() => setIsEditingAutomationName(true)} title="Umbenennen">
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
      </div>
      <div className="toolbar-actions">
        <button className="toolbar-btn primary" onClick={onSave} disabled={!hasAutomation}>
          <FaFloppyDiskIcon size={13} />
          Speichern
        </button>
        <button className="toolbar-btn" onClick={onCheckBlocks} disabled={!hasAutomation}>
          <FaListCheckIcon size={13} />
          Blöcke prüfen
        </button>
        <button className={`toolbar-btn ${yamlOpen ? 'active' : ''}`} onClick={onShowCode}>
          <FaCodeIcon size={13} />
          YAML
        </button>
      </div>
    </>
  );
};

export default Toolbar;
