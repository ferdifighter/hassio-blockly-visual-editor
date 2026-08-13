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
    const [workspaceReady, setWorkspaceReady] = useState(false);
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
      const host = blocklyDiv.current;
      if (!host) {
        return undefined;
      }

      const resizeWorkspace = (workspace: Blockly.WorkspaceSvg) => {
        Blockly.svgResize(workspace);
      };

      const injectIfNeeded = () => {
        if (workspaceRef.current) {
          resizeWorkspace(workspaceRef.current);
          return;
        }
        if (host.clientWidth < 20 || host.clientHeight < 20) {
          return;
        }

        const workspace = Blockly.inject(host, {
          toolbox: HA_TOOLBOX,
          theme: resolveBlocklyTheme(theme),
          renderer: 'zelos',
          media: './media/',
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
        workspace.addChangeListener(() => emitYaml());
        resizeWorkspace(workspace);
        setWorkspaceReady(true);
      };

      const observer = new ResizeObserver(() => injectIfNeeded());
      observer.observe(host);
      window.addEventListener('resize', injectIfNeeded);
      injectIfNeeded();

      return () => {
        window.removeEventListener('resize', injectIfNeeded);
        observer.disconnect();
        if (workspaceRef.current) {
          workspaceRef.current.dispose();
          workspaceRef.current = null;
        }
        setWorkspaceReady(false);
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
      if (!workspaceReady || !workspaceRef.current) {
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
    }, [automationId, emitYaml, loadWorkspaceState, onYamlChange, workspaceReady]);

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

    return (
      <section className="blockly-editor">
        {!automationId && (
          <div className="blockly-editor-placeholder">
            Wähle links eine Automatisierung oder lege eine neue an.
          </div>
        )}
        <div ref={blocklyDiv} className="blockly-editor-host" />
        {loading && automationId && <div className="blockly-editor-loading">Lade Automatisierung…</div>}
        {status && <div className={`blockly-editor-status ${status.kind}`}>{status.message}</div>}
      </section>
    );
  },
);

BlocklyEditor.displayName = 'BlocklyEditor';

export default BlocklyEditor;
