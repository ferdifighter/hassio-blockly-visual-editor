import React, { useState } from 'react'
import { DockingLayout, DockingLayoutConfig, DockingPanelConfig } from '@ferdifighter/react-docking-layout'
import "@ferdifighter/react-docking-layout/dist/styles.css";
import "@ferdifighter/react-docking-layout/dist/themes/dark.theme.css";
import "@ferdifighter/react-docking-layout/dist/themes/light.theme.css";


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
        width: 300,
        panels: filterPanels([
          {
            id: 'sidebar',
            title: 'Scripts',
            closable: false,
            pinned: true,
            content: (
              <div>
                <h3>Scripts</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li>📄 automation.yaml</li>
                  <li>📄 scripts.yaml</li>
                  <li>📁 Custom Scripts</li>
                  <li>➕ Neues Script</li>
                </ul>
              </div>
            ),
          },
        ]),
      },
      {
        id: 'center',
        panels: filterPanels([
          {
            id: 'toolbar',
            title: 'Toolbar',
            closable: false,
            canPin: false,
            hideHeader: true,
            resizable: false,
            size: 60,
            content: null, // Wird unten gesetzt
          },
          {
            id: 'editor',
            title: 'Blockly Editor',
            closable: false,
            canPin: false,
            hideHeader: true,
            content: (
              <div>
                <h2>Blockly Visual Editor</h2>
                <p>Hier wird der Blockly Editor angezeigt.</p>
                <p>Sie können Panels über die Toolbar ein- und ausblenden!</p>
              </div>
            ),
          },
          {
            id: 'debug',
            title: 'Debug Panel',
            closable: true,
            position: 'bottom',
            size: 200,
            resizable: true,
            content: (
              <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                <div>🔍 Debug Panel</div>
                <div>📊 Variablen: 0</div>
                <div>⚡ Ausführung: Bereit</div>
              </div>
            ),
          },
          {
            id: 'output',
            title: 'Output',
            closable: true,
            position: 'bottom',
            size: 200,
            resizable: true,
            content: (
              <div style={{ fontFamily: 'monospace', fontSize: '12px' }} className="panel-content">
                <div>📤 Output Panel</div>
                <div>📋 Logs werden hier angezeigt</div>
              </div>
            ),
          },
        ]),
      },
    ],
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
