import React, { useState } from 'react'
import { DockingLayout, DockingLayoutConfig, DockingPanelConfig } from '@ferdifighter/react-docking-layout'
import "@ferdifighter/react-docking-layout/dist/styles.css";
import "@ferdifighter/react-docking-layout/dist/themes/dark.theme.css";
import "@ferdifighter/react-docking-layout/dist/themes/light.theme.css";
import BlocklyEditor from './components/BlocklyEditor/BlocklyEditor';


const PANEL_IDS = ['sidebar', 'toolbar', 'editor', 'debug', 'output']

const App: React.FC = () => {
  // State für geschlossene Panels
  const [closedPanels, setClosedPanels] = useState<string[]>([])
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('dark')

  // Panels aus der Konfiguration extrahieren (nur schließbare, keine Toolbar)
  const getClosablePanels = (config: DockingLayoutConfig): { id: string; title: string }[] => {
    const result: { id: string; title: string }[] = []
    config.columns.forEach(col => {
      col.panels.forEach(panel => {
        if (panel.id !== 'toolbar' && panel.closable !== false) {
          result.push({ id: panel.id, title: panel.title })
        }
      })
    })
    return result
  }

  // Panels filtern je nach Sichtbarkeit
  const filterPanels = (panels: DockingPanelConfig[]) => panels.filter(p => !closedPanels.includes(p.id))

  // Die Panel-Konfiguration
  const [layoutConfig, setLayoutConfig] = useState<DockingLayoutConfig>({
    columns: [
      {
        id: 'left',
        width: 220,
        panels: filterPanels([
          {
            id: 'explorer',
            title: 'Explorer',
            closable: false,
            pinned: true,
            content: (
              <div>
                <h3>Navigation</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li>🏠 Dashboard</li>
                  <li>📁 Projekte</li>
                  <li>👥 Benutzer</li>
                  <li>⚙️ Einstellungen</li>
                </ul>
              </div>
            ),
          },
          {
            id: 'search',
            title: 'Suche',
            closable: false,
            pinned: true,
            content: (
              <div>
                <h3>Suche</h3>
                <input type="text" placeholder="Suchen..." style={{ width: '100%' }} />
              </div>
            ),
          },
        ]),
      },
      {
        id: 'center',
        panels: filterPanels([
          {
            id: 'toolbox',
            title: 'Toolbox',
            closable: false,
            canPin: false,
            hideHeader: true,
            resizable: false,
            size: 150,
            content: null, // Wird unten gesetzt
          },
          {
            id: 'editor',
            title: 'Editor',
            closable: false,
            canPin: false,
            hideHeader: true,
            contentPadding: 0, // Padding explizit entfernen
            content: (
              <BlocklyEditor />
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
            content: (
              <div style={{ fontFamily: 'monospace', fontSize: '12px' }} className="panel-content">
                <div>user@host:~$ echo Hallo Welt</div>
                <div>Hallo Welt</div>
              </div>
            ),
          },
        ]),
      },
      {
        id: 'right',
        width: 260,
        panels: filterPanels([
          {
            id: 'outline',
            title: 'Outline',
            closable: true,
            pinned: true,
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
        ]),
      },
    ],
    closedPanels,
    theme,
  })

  // Toolbar-Content dynamisch setzen (nachdem layoutConfig initialisiert ist)
  const closablePanels = getClosablePanels(layoutConfig)
  layoutConfig.columns[1].panels[0].content = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Blockly Editor</h2>
        <div style={{ marginLeft: 'auto' }}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>
            Theme:
            <select
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
      <div style={{ marginTop: 12 }}>
        <strong>Panels ein-/ausblenden:</strong>
        <div style={{
          marginTop: 6,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 16px',
          alignItems: 'center',
        }}>
          {closablePanels.map(panel => (
            <label key={panel.id} style={{ display: 'flex', alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={!closedPanels.includes(panel.id)}
                onChange={e => {
                  setClosedPanels(prev =>
                    e.target.checked
                      ? prev.filter(id => id !== panel.id)
                      : [...prev, panel.id]
                  )
                }}
                style={{ marginRight: 6 }}
              />
              {panel.title}
            </label>
          ))}
        </div>
      </div>
      <p style={{ marginTop: 16, color: '#888', fontSize: 12 }}>
        Die Toolbar kann nicht geschlossen werden.
      </p>
    </div>
  )

  const handleLayoutChange = (newConfig: DockingLayoutConfig) => {
    setLayoutConfig(newConfig)
  }

  const handlePanelClose = (panelId: string) => {
    setClosedPanels(prev => prev.includes(panelId) ? prev : [...prev, panelId])
  }

  // Theme-Klasse am Body setzen
  React.useEffect(() => {
    const root = document.body
    root.classList.remove('theme-light', 'theme-dark')
    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      root.classList.add(mq.matches ? 'theme-dark' : 'theme-light')
    } else {
      root.classList.add(`theme-${theme}`)
    }
  }, [theme])

  return (
    <DockingLayout
      config={layoutConfig}
      onLayoutChange={handleLayoutChange}
      closedPanels={closedPanels}
      onPanelClose={handlePanelClose}
      style={{
        height: '100vh',
        width: '100vw',
      }}
    />
  )
}

export default App
