import React, { useEffect, useRef } from 'react';
import { FaPlay, FaTrashCan } from 'react-icons/fa6';
import './ProtocolPanel.css';

const FaPlayIcon = FaPlay as React.ComponentType<{ size?: number }>;
const FaTrashCanIcon = FaTrashCan as React.ComponentType<{ size?: number }>;

export type SimulateLevel = 'info' | 'ok' | 'warn' | 'error' | 'result';

export interface SimulateEntry {
  level: SimulateLevel;
  category: string;
  message: string;
  detail?: unknown;
  time?: string;
}

export interface SimulateSummary {
  ok: boolean;
  conditionsMet: boolean;
  wouldRun: boolean;
  missingEntities: number;
  plannedActions: number;
  queries: number;
  errors: number;
}

interface ProtocolPanelProps {
  entries: SimulateEntry[];
  running?: boolean;
  onClose: () => void;
  onClear: () => void;
  onRun: () => void;
  canRun?: boolean;
}

function formatTime(value?: string): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDetail(detail: unknown): string {
  if (detail === undefined) {
    return '';
  }
  if (typeof detail === 'string') {
    return detail;
  }
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

const LEVEL_LABEL: Record<SimulateLevel, string> = {
  info: 'Info',
  ok: 'OK',
  warn: 'Hinweis',
  error: 'Fehler',
  result: 'Ergebnis',
};

const ProtocolPanel: React.FC<ProtocolPanelProps> = ({
  entries,
  running,
  onClose,
  onClear,
  onRun,
  canRun = true,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [entries, running]);

  return (
    <div className="app-log">
      <div className="app-log-header">
        <span>Protokoll</span>
        <div className="app-log-header-actions">
          <button type="button" className="app-log-action" onClick={onRun} disabled={!canRun || running} title="Simulation starten">
            <FaPlayIcon size={11} />
            Testen
          </button>
          <button type="button" className="app-log-action" onClick={onClear} disabled={!entries.length} title="Protokoll leeren">
            <FaTrashCanIcon size={11} />
            Leeren
          </button>
          <button type="button" onClick={onClose} aria-label="Protokoll schließen">
            ×
          </button>
        </div>
      </div>
      <div className="app-log-list" ref={listRef}>
        {running && <div className="app-log-running">Simulation läuft…</div>}
        {!running && entries.length === 0 && (
          <div className="app-log-empty">
            Starte einen Test, um Verbindungen, Bedingungen und Abfragen gegen Home Assistant zu prüfen.
            Schaltende Aktionen werden nur beschrieben, nicht ausgeführt.
          </div>
        )}
        {entries.map((item, index) => {
          const detail = formatDetail(item.detail);
          return (
            <div key={`${item.time || 'row'}-${index}`} className={`app-log-row level-${item.level}`}>
              <span className="app-log-time">{formatTime(item.time)}</span>
              <span className="app-log-level">{LEVEL_LABEL[item.level] || item.level}</span>
              <div className="app-log-body">
                <span className="app-log-message">{item.message}</span>
                {detail ? (
                  <details>
                    <summary>Details</summary>
                    <pre>{detail}</pre>
                  </details>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProtocolPanel;
