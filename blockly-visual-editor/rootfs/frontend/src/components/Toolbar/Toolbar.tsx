import React from 'react';

interface ToolbarProps {
  onDebug: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onDebug }) => (
  <nav style={{ background: '#444', color: '#fff', padding: 8, display: 'flex', gap: 8 }}>
    <button>Speichern</button>
    <button>Abbrechen</button>
    <button>Check Blocks</button>
    <button onClick={onDebug}>Debug</button>
  </nav>
);

export default Toolbar; 