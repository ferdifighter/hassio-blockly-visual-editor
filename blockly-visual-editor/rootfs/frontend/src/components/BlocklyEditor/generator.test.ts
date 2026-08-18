import { describe, expect, it, beforeAll } from 'vitest';
import * as Blockly from 'blockly';
import { registerAllHomeAssistantBlocks } from './blocks';
import {
  automationToYaml,
  blockToAction,
  blockToCondition,
  blockToText,
  blockToTrigger,
  emptyWorkspaceState,
  templateToExpression,
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

  it('setzt mehrzeiligen Angebotstext aus Teilen zusammen', () => {
    const workspace = new Blockly.Workspace();
    const join = workspace.newBlock('ha_text_join');
    join.setFieldValue('nl', 'SEP');
    const title = workspace.newBlock('ha_text');
    title.setFieldValue('Radeberger Pilsner Angebot', 'TEXT');
    join.getInput('ADD0')?.connection?.connect(title.outputConnection!);
    const place = workspace.newBlock('ha_text_labeled');
    place.setFieldValue('Ort', 'LABEL');
    const store = workspace.newBlock('ha_text');
    store.setFieldValue('Netto Markendiscount', 'TEXT');
    place.getInput('VALUE')?.connection?.connect(store.outputConnection!);
    join.getInput('ADD1')?.connection?.connect(place.outputConnection!);
    const price = workspace.newBlock('ha_text_labeled');
    price.setFieldValue('Preis', 'LABEL');
    const amount = workspace.newBlock('ha_entity_attribute');
    amount.setFieldValue('sensor.bierfinder', 'ENTITY_ID');
    amount.setFieldValue('price', 'ATTR');
    price.getInput('VALUE')?.connection?.connect(amount.outputConnection!);
    join.getInput('ADD2')?.connection?.connect(price.outputConnection!);

    expect(blockToText(join)).toBe(
      'Radeberger Pilsner Angebot\nOrt: Netto Markendiscount\nPreis: {{ state_attr(\'sensor.bierfinder\', \'price\') }}',
    );
    workspace.dispose();
  });

  it('sendet den zusammengesetzten Text per Telegram und Companion-App', () => {
    const workspace = new Blockly.Workspace();
    const text = workspace.newBlock('ha_text');
    text.setFieldValue('Radeberger Pilsner Angebot', 'TEXT');
    const telegram = workspace.newBlock('ha_notify_telegram');
    telegram.getInput('MESSAGE_VALUE')?.connection?.connect(text.outputConnection!);
    expect(blockToAction(telegram)).toEqual({
      action: 'notify.telegram',
      data: { message: 'Radeberger Pilsner Angebot' },
    });

    const push = workspace.newBlock('ha_notify');
    push.setFieldValue('notify.mobile_app_iphone', 'NOTIFY_SERVICE');
    const copy = workspace.newBlock('ha_text');
    copy.setFieldValue('Radeberger Pilsner Angebot', 'TEXT');
    push.getInput('MESSAGE_VALUE')?.connection?.connect(copy.outputConnection!);
    expect(blockToAction(push)?.data).toEqual({ message: 'Radeberger Pilsner Angebot' });
    workspace.dispose();
  });

  it('erzeugt Alexa-Sprache, Anwesenheit und einmaliges Merken', () => {
    const workspace = new Blockly.Workspace();
    const present = workspace.newBlock('ha_if_present');
    present.setFieldValue('binary_sensor.buro_belegt', 'ENTITY_ID');
    expect(blockToCondition(present)).toEqual({
      condition: 'state',
      entity_id: 'binary_sensor.buro_belegt',
      state: 'on',
    });

    const person = workspace.newBlock('ha_if_present');
    person.setFieldValue('person.ferdi', 'ENTITY_ID');
    expect(blockToCondition(person)).toEqual({
      condition: 'state',
      entity_id: 'person.ferdi',
      state: 'home',
    });

    const beer = workspace.newBlock('ha_entity_state');
    beer.setFieldValue('sensor.bierfinder', 'ENTITY_ID');
    const notYet = workspace.newBlock('ha_if_not_remembered');
    notYet.setFieldValue('input_text.letzte_biermeldung', 'HELPER');
    notYet.getInput('VALUE')?.connection?.connect(beer.outputConnection!);
    expect(blockToCondition(notYet)).toEqual({
      condition: 'template',
      value_template: "{{ ((states('sensor.bierfinder'))) != states('input_text.letzte_biermeldung') }}",
    });

    const remember = workspace.newBlock('ha_remember');
    remember.setFieldValue('input_text.letzte_biermeldung', 'HELPER');
    const beer2 = workspace.newBlock('ha_entity_state');
    beer2.setFieldValue('sensor.bierfinder', 'ENTITY_ID');
    remember.getInput('VALUE')?.connection?.connect(beer2.outputConnection!);
    expect(blockToAction(remember)).toEqual({
      action: 'input_text.set_value',
      target: { entity_id: 'input_text.letzte_biermeldung' },
      data: { value: "{{ (states('sensor.bierfinder')) }}" },
    });

    const alexa = workspace.newBlock('ha_alexa_speak');
    alexa.setFieldValue('tts', 'SPEAK_TYPE');
    alexa.setFieldValue('media_player.echo_buro', 'ENTITY_ID');
    alexa.setFieldValue('Radeberger ist im Angebot', 'MESSAGE');
    expect(blockToAction(alexa)).toEqual({
      action: 'notify.alexa_media',
      data: {
        message: 'Radeberger ist im Angebot',
        target: ['media_player.echo_buro'],
        data: { type: 'tts' },
      },
    });
    workspace.dispose();
  });

  it('wandelt gemischten Text in einen Jinja-Ausdruck', () => {
    expect(templateToExpression('Ort: {{ state_attr(\'sensor.bier\', \'store\') }}')).toBe(
      '"Ort: " ~ (state_attr(\'sensor.bier\', \'store\'))',
    );
  });
});
