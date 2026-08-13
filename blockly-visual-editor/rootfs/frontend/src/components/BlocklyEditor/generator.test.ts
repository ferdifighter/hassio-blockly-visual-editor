import { describe, expect, it, beforeAll } from 'vitest';
import * as Blockly from 'blockly';
import { registerAllHomeAssistantBlocks } from './blocks';
import {
  automationToYaml,
  blockToAction,
  blockToTrigger,
  emptyWorkspaceState,
  toYaml,
  workspaceToAutomation,
} from './generator';

beforeAll(() => {
  registerAllHomeAssistantBlocks();
});

describe('Home Assistant Blockly-Generator', () => {
  it('erzeugt einen Zeit-Trigger aus einem Block', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('ha_time_trigger');
    block.setFieldValue('06:30', 'TIME');
    expect(blockToTrigger(block)).toEqual({ trigger: 'time', at: '06:30' });
    workspace.dispose();
  });

  it('erzeugt einen Service-Aufruf mit Ziel-Entität', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('ha_call_service');
    block.setFieldValue('light.turn_on', 'SERVICE');
    block.setFieldValue('light.wohnzimmer', 'ENTITY_ID');
    block.setFieldValue('{"brightness": 200}', 'SERVICE_DATA');
    expect(blockToAction(block)).toEqual({
      action: 'light.turn_on',
      target: { entity_id: 'light.wohnzimmer' },
      data: { brightness: 200 },
    });
    workspace.dispose();
  });

  it('wandelt einen Automatisierungs-Block in HA-YAML um', () => {
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(emptyWorkspaceState(), workspace);
    const root = workspace.getBlocksByType('ha_automation', false)[0];
    const trigger = workspace.newBlock('ha_time_trigger');
    trigger.setFieldValue('07:00', 'TIME');
    const action = workspace.newBlock('ha_light_on');
    action.setFieldValue('light.kueche', 'ENTITY_ID');
    root.getInput('TRIGGERS')?.connection?.connect(trigger.previousConnection!);
    root.getInput('ACTIONS')?.connection?.connect(action.previousConnection!);

    const automation = workspaceToAutomation(workspace, {
      id: 'auto_1',
      alias: 'Licht morgens',
    });
    expect(automation.triggers).toEqual([{ trigger: 'time', at: '07:00' }]);
    expect(automation.actions).toEqual([
      { action: 'light.turn_on', target: { entity_id: 'light.kueche' } },
    ]);

    const yaml = automationToYaml(automation);
    expect(yaml).toContain('alias: "Licht morgens"');
    expect(yaml).toContain('trigger: time');
    expect(yaml).toContain('action: light.turn_on');
    workspace.dispose();
  });

  it('serialisiert verschachtelte Objekte als YAML', () => {
    expect(toYaml({ triggers: [{ trigger: 'time', at: '07:00' }] })).toContain('- trigger: time');
  });
});
