import React from 'react';

interface DebugPanelProps {
  open: boolean;
  onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <aside style={{ background: '#111', color: '#fff', padding: 16, width: '100%', height: '100%', boxSizing: 'border-box' }}>
      <h3>Debug Panel</h3>
      <p>Hier erscheinen Debug-Informationen.</p>
      <button onClick={onClose}>Schließen</button>
    </aside>
  );
};

export default DebugPanel; 