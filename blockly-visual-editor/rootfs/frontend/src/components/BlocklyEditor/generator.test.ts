import { describe, expect, it, beforeAll } from 'vitest';
import * as Blockly from 'blockly';
import { registerAllHomeAssistantBlocks } from './blocks';
import {
  automationToYaml,
  blockToAction,
  blockToCondition,
  blockToTrigger,
  emptyWorkspaceState,
  toYaml,
  workspaceHasUserContent,
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

  it('erzeugt eine Companion-App-Benachrichtigung', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('ha_notify');
    block.setFieldValue('notify.mobile_app_iphone', 'NOTIFY_SERVICE');
    block.setFieldValue('Tür wurde geöffnet!', 'MESSAGE');
    block.setFieldValue('Alarm', 'TITLE');
    expect(blockToAction(block)).toEqual({
      action: 'notify.mobile_app_iphone',
      data: {
        message: 'Tür wurde geöffnet!',
        title: 'Alarm',
      },
    });
    workspace.dispose();
  });

  it('serialisiert verschachtelte Objekte als YAML', () => {
    expect(toYaml({ triggers: [{ trigger: 'time', at: '07:00' }] })).toContain('- trigger: time');
  });

  it('erkennt einen leeren Workspace ohne Nutzerinhalt', () => {
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(emptyWorkspaceState(), workspace);
    expect(workspaceHasUserContent(workspace)).toBe(false);
    workspace.dispose();
  });

  it('erkennt Trigger und Aktionen als Nutzerinhalt', () => {
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(emptyWorkspaceState(), workspace);
    const root = workspace.getBlocksByType('ha_automation', false)[0];
    const trigger = workspace.newBlock('ha_time_trigger');
    trigger.setFieldValue('11:13', 'TIME');
    root.getInput('TRIGGERS')?.connection?.connect(trigger.previousConnection!);
    expect(workspaceHasUserContent(workspace)).toBe(true);
    workspace.dispose();
  });

  it('zeigt den Entitätsnamen statt der ID auf dem Block', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('ha_light_on');
    expect(block.getField('ENTITY_ID')?.getText()).toBe('Licht wählen');
    block.setFieldValue('light.kueche', 'ENTITY_ID');
    expect(block.getFieldValue('ENTITY_ID')).toBe('light.kueche');
    workspace.dispose();
  });

  it('erzeugt einen Datum-Uhrzeit-Trigger', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('ha_datetime_trigger');
    block.setFieldValue('2026-08-13 11:13', 'DATETIME');
    expect(blockToTrigger(block)).toEqual({
      trigger: 'template',
      value_template: "{{ now().strftime('%Y-%m-%d %H:%M') == '2026-08-13 11:13' }}",
    });
    workspace.dispose();
  });

  it('erzeugt einen Kalender-Trigger', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('ha_calendar_trigger');
    block.setFieldValue('calendar.familie', 'ENTITY_ID');
    block.setFieldValue('start', 'CALENDAR_EVENT');
    block.setFieldValue('-00:15:00', 'OFFSET');
    expect(blockToTrigger(block)).toEqual({
      trigger: 'calendar',
      entity_id: 'calendar.familie',
      event: 'start',
      offset: '-00:15:00',
    });
    workspace.dispose();
  });

  it('erzeugt eine Zeitbedingung mit Wochentagen', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('ha_if_time');
    block.setFieldValue('06:00', 'AFTER');
    block.setFieldValue('22:00', 'BEFORE');
    block.setFieldValue('mon,tue,wed,thu,fri', 'WEEKDAYS');
    expect(blockToCondition(block)).toEqual({
      condition: 'time',
      after: '06:00',
      before: '22:00',
      weekday: ['mon', 'tue', 'wed', 'thu', 'fri'],
    });
    workspace.dispose();
  });

  it('erzeugt eine Datumsbedingung', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('ha_if_date');
    block.setFieldValue('2026-12-24', 'DATE');
    expect(blockToCondition(block)).toEqual({
      condition: 'template',
      value_template: "{{ now().date() | string == '2026-12-24' }}",
    });
    workspace.dispose();
  });

  it('erzeugt eine Verzögerung aus dem Dauerfeld', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('ha_delay');
    block.setFieldValue('00:01:30', 'DELAY_TIME');
    expect(blockToAction(block)).toEqual({ delay: '00:01:30' });
    workspace.dispose();
  });
});
