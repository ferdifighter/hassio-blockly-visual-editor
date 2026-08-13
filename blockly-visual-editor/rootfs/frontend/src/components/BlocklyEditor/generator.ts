import * as Blockly from 'blockly';

export type JsonObject = Record<string, unknown>;

export interface HomeAssistantAutomation {
  id: string;
  alias: string;
  description?: string;
  mode?: string;
  triggers: JsonObject[];
  conditions: JsonObject[];
  actions: JsonObject[];
}

const TRIGGER_TYPES = new Set([
  'ha_time_trigger',
  'ha_state_trigger',
  'ha_numeric_state_trigger',
  'ha_event_trigger',
  'ha_webhook_trigger',
  'ha_sun_trigger',
  'ha_template_trigger',
  'ha_homeassistant_trigger',
]);

const CONDITION_TYPES = new Set([
  'ha_if_state',
  'ha_if_numeric_state',
  'ha_if_time',
  'ha_if_sun',
  'ha_if_template',
  'ha_if_and',
  'ha_if_or',
  'ha_if_not',
]);

const ACTION_TYPES = new Set([
  'ha_call_service',
  'ha_activate_scene',
  'ha_notify',
  'ha_delay',
  'ha_wait_for_state',
  'ha_wait_for_template',
  'ha_repeat',
  'ha_repeat_while',
  'ha_if_else',
  'ha_stop',
  'ha_light_on',
  'ha_light_off',
  'ha_switch_toggle',
  'ha_set_variable',
  'ha_send_push',
]);

function field(block: Blockly.Block, name: string): string {
  return String(block.getFieldValue(name) ?? '').trim();
}

function optionalField(block: Blockly.Block, name: string): string | undefined {
  const value = field(block, name);
  return value ? value : undefined;
}

function parseJsonObject(raw: string | undefined): JsonObject | undefined {
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function splitCsv(raw: string | undefined): string[] | undefined {
  if (!raw) {
    return undefined;
  }
  const items = raw.split(',').map((item) => item.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

export function collectStatementBlocks(block: Blockly.Block, inputName: string): Blockly.Block[] {
  const input = block.getInput(inputName);
  let child = input?.connection?.targetBlock() ?? null;
  const blocks: Blockly.Block[] = [];
  while (child) {
    if (!child.isShadow()) {
      blocks.push(child);
    }
    child = child.getNextBlock();
  }
  return blocks;
}

function omitEmpty<T extends JsonObject>(value: T): T {
  const result: JsonObject = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined || entry === '' || entry === null) {
      continue;
    }
    result[key] = entry;
  }
  return result as T;
}

export function blockToTrigger(block: Blockly.Block): JsonObject | null {
  switch (block.type) {
    case 'ha_time_trigger':
      return { trigger: 'time', at: field(block, 'TIME') || '00:00' };
    case 'ha_state_trigger':
      return omitEmpty({
        trigger: 'state',
        entity_id: field(block, 'ENTITY_ID') || field(block, 'ENTITY'),
        from: optionalField(block, 'FROM'),
        to: optionalField(block, 'TO'),
        for: optionalField(block, 'FOR'),
      });
    case 'ha_numeric_state_trigger':
      return omitEmpty({
        trigger: 'numeric_state',
        entity_id: field(block, 'ENTITY_ID'),
        above: optionalField(block, 'ABOVE'),
        below: optionalField(block, 'BELOW'),
      });
    case 'ha_event_trigger':
      return omitEmpty({
        trigger: 'event',
        event_type: field(block, 'EVENT_TYPE'),
        event_data: parseJsonObject(optionalField(block, 'EVENT_DATA')),
      });
    case 'ha_webhook_trigger':
      return { trigger: 'webhook', webhook_id: field(block, 'WEBHOOK_ID') };
    case 'ha_sun_trigger':
      return omitEmpty({
        trigger: 'sun',
        event: field(block, 'SUN_EVENT') || 'sunrise',
        offset: optionalField(block, 'OFFSET'),
      });
    case 'ha_template_trigger':
      return { trigger: 'template', value_template: field(block, 'TEMPLATE') };
    case 'ha_homeassistant_trigger':
      return { trigger: 'homeassistant', event: field(block, 'EVENT') || 'start' };
    default:
      return null;
  }
}

export function blockToCondition(block: Blockly.Block): JsonObject | null {
  switch (block.type) {
    case 'ha_if_state':
      return omitEmpty({
        condition: 'state',
        entity_id: field(block, 'ENTITY_ID'),
        state: field(block, 'STATE'),
        for: optionalField(block, 'FOR'),
      });
    case 'ha_if_numeric_state':
      return omitEmpty({
        condition: 'numeric_state',
        entity_id: field(block, 'ENTITY_ID'),
        above: optionalField(block, 'ABOVE'),
        below: optionalField(block, 'BELOW'),
      });
    case 'ha_if_time':
      return omitEmpty({
        condition: 'time',
        after: optionalField(block, 'AFTER'),
        before: optionalField(block, 'BEFORE'),
        weekday: splitCsv(optionalField(block, 'WEEKDAYS')),
      });
    case 'ha_if_sun':
      return {
        condition: 'state',
        entity_id: 'sun.sun',
        state: field(block, 'SUN_STATE') || 'above_horizon',
      };
    case 'ha_if_template':
      return { condition: 'template', value_template: field(block, 'TEMPLATE') };
    case 'ha_if_and':
      return {
        condition: 'and',
        conditions: collectStatementBlocks(block, 'CONDITIONS')
          .map(blockToCondition)
          .filter((item): item is JsonObject => Boolean(item)),
      };
    case 'ha_if_or':
      return {
        condition: 'or',
        conditions: collectStatementBlocks(block, 'CONDITIONS')
          .map(blockToCondition)
          .filter((item): item is JsonObject => Boolean(item)),
      };
    case 'ha_if_not': {
      const inner = collectStatementBlocks(block, 'CONDITION')
        .map(blockToCondition)
        .filter((item): item is JsonObject => Boolean(item));
      return { condition: 'not', conditions: inner };
    }
    default:
      return null;
  }
}

function serviceAction(service: string, entityId?: string, data?: JsonObject): JsonObject {
  return omitEmpty({
    action: service,
    target: entityId ? { entity_id: entityId } : undefined,
    data,
  });
}

export function blockToAction(block: Blockly.Block): JsonObject | null {
  switch (block.type) {
    case 'ha_call_service':
      return serviceAction(
        field(block, 'SERVICE') || 'homeassistant.toggle',
        optionalField(block, 'ENTITY_ID'),
        parseJsonObject(optionalField(block, 'SERVICE_DATA')),
      );
    case 'ha_activate_scene':
      return serviceAction('scene.turn_on', field(block, 'SCENE_ID') || field(block, 'SCENE'));
    case 'ha_notify': {
      const raw = field(block, 'NOTIFY_SERVICE') || 'notify.notify';
      const action = raw.includes('.') ? raw : `notify.${raw}`;
      return omitEmpty({
        action,
        data: omitEmpty({
          message: field(block, 'MESSAGE'),
          title: optionalField(block, 'TITLE'),
        }),
      });
    }
    case 'ha_delay': {
      const seconds = Number(block.getFieldValue('SECONDS') ?? 0);
      const delayTime = optionalField(block, 'DELAY_TIME');
      return delayTime ? { delay: delayTime } : { delay: { seconds: Number.isFinite(seconds) ? seconds : 0 } };
    }
    case 'ha_wait_for_state':
      return omitEmpty({
        wait_for_trigger: [
          omitEmpty({
            trigger: 'state',
            entity_id: field(block, 'ENTITY_ID'),
            to: field(block, 'STATE'),
          }),
        ],
        timeout: optionalField(block, 'TIMEOUT'),
        continue_on_timeout: true,
      });
    case 'ha_wait_for_template':
      return omitEmpty({
        wait_template: field(block, 'TEMPLATE'),
        timeout: optionalField(block, 'TIMEOUT'),
        continue_on_timeout: true,
      });
    case 'ha_repeat':
      return {
        repeat: {
          count: Number(block.getFieldValue('COUNT') ?? 1) || 1,
          sequence: collectStatementBlocks(block, 'DO')
            .map(blockToAction)
            .filter((item): item is JsonObject => Boolean(item)),
        },
      };
    case 'ha_repeat_while':
      return {
        repeat: {
          while: collectStatementBlocks(block, 'WHILE')
            .map(blockToCondition)
            .filter((item): item is JsonObject => Boolean(item)),
          sequence: collectStatementBlocks(block, 'DO')
            .map(blockToAction)
            .filter((item): item is JsonObject => Boolean(item)),
        },
      };
    case 'ha_if_else':
      return omitEmpty({
        if: collectStatementBlocks(block, 'IF')
          .map(blockToCondition)
          .filter((item): item is JsonObject => Boolean(item)),
        then: collectStatementBlocks(block, 'THEN')
          .map(blockToAction)
          .filter((item): item is JsonObject => Boolean(item)),
        else: (() => {
          const actions = collectStatementBlocks(block, 'ELSE')
            .map(blockToAction)
            .filter((item): item is JsonObject => Boolean(item));
          return actions.length ? actions : undefined;
        })(),
      });
    case 'ha_stop':
      return { stop: optionalField(block, 'REASON') || 'stopped' };
    case 'ha_light_on':
      return serviceAction('light.turn_on', field(block, 'ENTITY_ID'));
    case 'ha_light_off':
      return serviceAction('light.turn_off', field(block, 'ENTITY_ID'));
    case 'ha_switch_toggle':
      return serviceAction('switch.toggle', field(block, 'ENTITY_ID'));
    case 'ha_set_variable':
      return {
        variables: {
          [field(block, 'NAME') || field(block, 'VARIABLE_NAME') || 'var']: field(block, 'VALUE'),
        },
      };
    case 'ha_send_push':
      return {
        action: 'notify.notify',
        data: { message: field(block, 'MESSAGE') },
      };
    default:
      return null;
  }
}

export function workspaceToAutomation(
  workspace: Blockly.Workspace,
  meta: { id: string; alias: string; description?: string; mode?: string },
): HomeAssistantAutomation {
  const roots = workspace.getBlocksByType('ha_automation', false);
  const root = roots[0];

  let triggerBlocks: Blockly.Block[] = [];
  let conditionBlocks: Blockly.Block[] = [];
  let actionBlocks: Blockly.Block[] = [];

  if (root) {
    triggerBlocks = collectStatementBlocks(root, 'TRIGGERS');
    conditionBlocks = collectStatementBlocks(root, 'CONDITIONS');
    actionBlocks = collectStatementBlocks(root, 'ACTIONS');
  } else {
    for (const block of workspace.getTopBlocks(true)) {
      if (TRIGGER_TYPES.has(block.type)) {
        triggerBlocks.push(block);
        const nestedActions = collectStatementBlocks(block, 'DO');
        actionBlocks.push(...nestedActions);
      } else if (CONDITION_TYPES.has(block.type)) {
        conditionBlocks.push(block);
      } else if (ACTION_TYPES.has(block.type)) {
        actionBlocks.push(block);
      }
    }
  }

  return {
    id: meta.id,
    alias: meta.alias,
    description: meta.description || '',
    mode: meta.mode || 'single',
    triggers: triggerBlocks.map(blockToTrigger).filter((item): item is JsonObject => Boolean(item)),
    conditions: conditionBlocks.map(blockToCondition).filter((item): item is JsonObject => Boolean(item)),
    actions: actionBlocks.map(blockToAction).filter((item): item is JsonObject => Boolean(item)),
  };
}

export function validateWorkspace(workspace: Blockly.Workspace): string[] {
  const warnings: string[] = [];
  const automation = workspaceToAutomation(workspace, { id: 'preview', alias: 'preview' });
  const roots = workspace.getBlocksByType('ha_automation', false);

  if (roots.length === 0) {
    warnings.push('Kein Automatisierungs-Block vorhanden. Ziehe „Automatisierung“ aus der Toolbox.');
  } else if (roots.length > 1) {
    warnings.push('Es sollte nur ein Automatisierungs-Block im Workspace liegen.');
  }
  if (automation.triggers.length === 0) {
    warnings.push('Mindestens ein Trigger ist erforderlich.');
  }
  if (automation.actions.length === 0) {
    warnings.push('Mindestens eine Aktion ist erforderlich.');
  }
  return warnings;
}

function dumpString(value: string): string {
  if (value === '' || /[:#{}[\],&*?|<>=!%@`'"]/.test(value) || value.includes('\n') || value.includes(' ')) {
    return JSON.stringify(value);
  }
  return value;
}

export function toYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (value === undefined) {
    return '';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return dumpString(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          const nested = toYaml(item, indent + 1).split('\n');
          const first = nested[0]?.trimStart() ?? '{}';
          const rest = nested.slice(1).join('\n');
          return `${pad}- ${first}${rest ? `\n${rest}` : ''}`;
        }
        return `${pad}- ${toYaml(item, 0)}`;
      })
      .join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as JsonObject).filter(([, entry]) => entry !== undefined);
    if (entries.length === 0) {
      return '{}';
    }
    return entries
      .map(([key, entry]) => {
        if (entry !== null && typeof entry === 'object') {
          const nested = toYaml(entry, indent + 1);
          if (nested === '[]' || nested === '{}') {
            return `${pad}${key}: ${nested}`;
          }
          return `${pad}${key}:\n${nested}`;
        }
        return `${pad}${key}: ${toYaml(entry, 0)}`;
      })
      .join('\n');
  }
  return String(value);
}

export function automationToYaml(automation: HomeAssistantAutomation): string {
  return toYaml({
    id: automation.id,
    alias: automation.alias,
    description: automation.description || undefined,
    mode: automation.mode || 'single',
    triggers: automation.triggers,
    conditions: automation.conditions,
    actions: automation.actions,
  });
}

export type WorkspaceState = ReturnType<typeof Blockly.serialization.workspaces.save>;

export function emptyWorkspaceState(): WorkspaceState {
  return {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'ha_automation',
          id: 'automation_root',
          x: 40,
          y: 40,
          deletable: false,
        },
      ],
    },
  };
}
