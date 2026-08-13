import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as Blockly from 'blockly';
import * as De from 'blockly/msg/de';
import { registerAllHomeAssistantBlocks } from './blocks';
import { HA_TOOLBOX } from './toolbox';
import { resolveBlocklyTheme } from './themes';
import {
  automationToYaml,
  emptyWorkspaceState,
  validateWorkspace,
  workspaceToAutomation,
  type HomeAssistantAutomation,
  type WorkspaceState,
} from './generator';
import { apiGet, apiSend } from '../../api';
import './BlocklyEditor.css';

Blockly.setLocale(De as unknown as { [key: string]: string });
registerAllHomeAssistantBlocks();

export interface BlocklyEditorHandle {
  handleSave: () => Promise<void>;
  showCode: () => string;
  checkBlocks: () => string[];
}

interface BlocklyEditorProps {
  theme: 'light' | 'dark' | 'auto';
  automationId?: string | null;
  automationName?: string | null;
  onYamlChange?: (yaml: string) => void;
  onStatus?: (message: string, kind?: 'info' | 'success' | 'error') => void;
}

interface AutomationResponse {
  id?: string;
  alias?: string;
  description?: string;
  mode?: string;
  workspace?: WorkspaceState;
  xml?: string;
}

const BlocklyEditor = forwardRef<BlocklyEditorHandle, BlocklyEditorProps>(
  ({ theme, automationId, automationName, onYamlChange, onStatus }, ref) => {
    const blocklyDiv = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const [status, setStatus] = useState<{ message: string; kind: 'info' | 'success' | 'error' } | null>(null);
    const [loading, setLoading] = useState(false);

    const emitStatus = useCallback(
      (message: string, kind: 'info' | 'success' | 'error' = 'info') => {
        setStatus({ message, kind });
        onStatus?.(message, kind);
      },
      [onStatus],
    );

    const emitYaml = useCallback(() => {
      if (!workspaceRef.current || !onYamlChange) {
        return;
      }
      const automation = workspaceToAutomation(workspaceRef.current, {
        id: automationId || 'preview',
        alias: automationName || automationId || 'Neue Automatisierung',
      });
      onYamlChange(automationToYaml(automation));
    }, [automationId, automationName, onYamlChange]);

    const loadWorkspaceState = useCallback((state: WorkspaceState) => {
      const workspace = workspaceRef.current;
      if (!workspace) {
        return;
      }
      Blockly.Events.disable();
      try {
        Blockly.serialization.workspaces.load(state, workspace);
        workspace.getBlocksByType('ha_automation', false).forEach((block) => {
          block.setDeletable(false);
        });
      } finally {
        Blockly.Events.enable();
      }
      emitYaml();
    }, [emitYaml]);

    useEffect(() => {
      if (!blocklyDiv.current || workspaceRef.current) {
        return undefined;
      }

      const workspace = Blockly.inject(blocklyDiv.current, {
        toolbox: HA_TOOLBOX,
        theme: resolveBlocklyTheme(theme),
        renderer: 'zelos',
        grid: {
          spacing: 20,
          length: 3,
          colour: '#555',
          snap: true,
        },
        trashcan: true,
        move: {
          scrollbars: true,
          drag: true,
          wheel: true,
        },
        zoom: {
          controls: true,
          wheel: true,
          startScale: 0.9,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2,
        },
        sounds: false,
      });
      workspaceRef.current = workspace;
      Blockly.serialization.workspaces.load(emptyWorkspaceState(), workspace);

      const changeListener = () => emitYaml();
      workspace.addChangeListener(changeListener);

      const resize = () => Blockly.svgResize(workspace);
      const observer = new ResizeObserver(resize);
      observer.observe(blocklyDiv.current);
      window.setTimeout(resize, 0);

      return () => {
        workspace.removeChangeListener(changeListener);
        observer.disconnect();
        workspace.dispose();
        workspaceRef.current = null;
      };
      // Theme is applied separately so the workspace is not recreated.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const workspace = workspaceRef.current;
      if (!workspace) {
        return;
      }
      workspace.setTheme(resolveBlocklyTheme(theme));
    }, [theme]);

    useEffect(() => {
      if (!workspaceRef.current) {
        return;
      }
      if (!automationId) {
        Blockly.serialization.workspaces.load(emptyWorkspaceState(), workspaceRef.current);
        onYamlChange?.('');
        return;
      }

      let cancelled = false;
      setLoading(true);
      apiGet<AutomationResponse>(`api/automations/${automationId}`)
        .then((data) => {
          if (cancelled || !workspaceRef.current) {
            return;
          }
          if (data.workspace && data.workspace.blocks) {
            loadWorkspaceState(data.workspace);
            return;
          }
          if (data.xml) {
            try {
              const dom = Blockly.utils.xml.textToDom(data.xml);
              workspaceRef.current.clear();
              Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
              emitYaml();
              return;
            } catch (error) {
              console.warn('Altes XML konnte nicht importiert werden:', error);
            }
          }
          loadWorkspaceState(emptyWorkspaceState());
        })
        .catch(() => {
          if (!cancelled) {
            loadWorkspaceState(emptyWorkspaceState());
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [automationId, emitYaml, loadWorkspaceState, onYamlChange]);

    const handleSave = useCallback(async () => {
      const workspace = workspaceRef.current;
      if (!automationId || !workspace) {
        return;
      }
      const alias = (automationName || automationId).trim();
      if (!alias) {
        emitStatus('Name darf nicht leer sein.', 'error');
        return;
      }

      const warnings = validateWorkspace(workspace);
      if (warnings.length) {
        emitStatus(warnings[0], 'error');
      }

      const automation: HomeAssistantAutomation = workspaceToAutomation(workspace, {
        id: automationId,
        alias,
      });
      const workspaceState = Blockly.serialization.workspaces.save(workspace);

      setLoading(true);
      try {
        await apiSend(`api/automations/${automationId}`, 'PUT', {
          alias,
          description: '',
          mode: automation.mode,
          workspace: workspaceState,
          automation,
        });
        emitStatus('Automatisierung gespeichert.', 'success');
        emitYaml();
      } catch (error) {
        emitStatus(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.', 'error');
      } finally {
        setLoading(false);
      }
    }, [automationId, automationName, emitStatus, emitYaml]);

    const showCode = useCallback(() => {
      if (!workspaceRef.current) {
        return '';
      }
      const yaml = automationToYaml(
        workspaceToAutomation(workspaceRef.current, {
          id: automationId || 'preview',
          alias: automationName || automationId || 'Neue Automatisierung',
        }),
      );
      onYamlChange?.(yaml);
      return yaml;
    }, [automationId, automationName, onYamlChange]);

    const checkBlocks = useCallback(() => {
      if (!workspaceRef.current) {
        return ['Workspace nicht bereit.'];
      }
      const warnings = validateWorkspace(workspaceRef.current);
      emitStatus(warnings.length ? warnings.join(' ') : 'Blöcke sind gültig.', warnings.length ? 'error' : 'success');
      return warnings;
    }, [emitStatus]);

    useImperativeHandle(ref, () => ({ handleSave, showCode, checkBlocks }), [handleSave, showCode, checkBlocks]);

    if (!automationId) {
      onYamlChange?.('');
    }

    return (
      <section className="blockly-editor">
        {!automationId && (
          <div className="blockly-editor-placeholder">Keine Automatisierung ausgewählt</div>
        )}
        <div
          ref={blocklyDiv}
          className="blockly-editor-host"
          style={{ visibility: automationId ? 'visible' : 'hidden' }}
        />
        {loading && automationId && <div className="blockly-editor-loading">Lade Automatisierung…</div>}
        {status && <div className={`blockly-editor-status ${status.kind}`}>{status.message}</div>}
      </section>
    );
  },
);

BlocklyEditor.displayName = 'BlocklyEditor';

export default BlocklyEditor;
