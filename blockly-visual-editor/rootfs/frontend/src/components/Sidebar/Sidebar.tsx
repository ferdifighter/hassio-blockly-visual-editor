import React from 'react';

const scripts = [
  { id: 1, name: 'Licht einschalten' },
  { id: 2, name: 'Alarm auslösen' },
  { id: 3, name: 'Heizung steuern' }
];

const Sidebar: React.FC = () => (
  <aside style={{
    height: '100%',
    width: '100%',
    background: '#222',
    color: '#fff',
    padding: 16,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  }}>
    <h2>Scripts</h2>
    <ul style={{ listStyle: 'none', padding: 0, flex: 1 }}>
      {scripts.map(script => (
        <li key={script.id} style={{ margin: '8px 0', padding: '8px', background: '#333', borderRadius: 4, cursor: 'pointer' }}>
          {script.name}
        </li>
      ))}
    </ul>
    <button style={{ marginTop: 16, width: '100%' }}>Neues Script</button>
  </aside>
);

export default Sidebar; 