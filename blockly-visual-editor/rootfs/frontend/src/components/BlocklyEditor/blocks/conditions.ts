import * as Blockly from 'blockly';

export function registerConditionBlocks() {
  // Zustand-Bedingung
  Blockly.Blocks['ha_if_state'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Zustand von')
        .appendField(new Blockly.FieldTextInput('sensor.temperatur'), 'ENTITY_ID')
        .appendField('ist')
        .appendField(new Blockly.FieldTextInput('über 20'), 'STATE');
      this.appendDummyInput()
        .appendField('für (optional)')
        .appendField(new Blockly.FieldTextInput(''), 'FOR');
      this.setOutput(true, 'Boolean');
      this.setColour(60);
      this.setTooltip('Bedingung: Zustand prüfen.');
      this.setHelpUrl('');
    }
  };

  // Zeit-Bedingung
  Blockly.Blocks['ha_if_time'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Zeit nach')
        .appendField(new Blockly.FieldTextInput('06:00'), 'AFTER')
        .appendField('und vor')
        .appendField(new Blockly.FieldTextInput('22:00'), 'BEFORE');
      this.appendDummyInput()
        .appendField('Wochentage (optional)')
        .appendField(new Blockly.FieldTextInput(''), 'WEEKDAYS');
      this.setOutput(true, 'Boolean');
      this.setColour(60);
      this.setTooltip('Bedingung: Zeit prüfen.');
      this.setHelpUrl('');
    }
  };

  // Sun-Bedingung
  Blockly.Blocks['ha_if_sun'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Sonne ist')
        .appendField(new Blockly.FieldDropdown([
          ['aufgegangen', 'above_horizon'],
          ['untergegangen', 'below_horizon']
        ]), 'SUN_STATE');
      this.appendDummyInput()
        .appendField('Offset (optional)')
        .appendField(new Blockly.FieldTextInput(''), 'OFFSET');
      this.setOutput(true, 'Boolean');
      this.setColour(60);
      this.setTooltip('Bedingung: Sonnenstand prüfen.');
      this.setHelpUrl('');
    }
  };

  // Template-Bedingung
  Blockly.Blocks['ha_if_template'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Template-Bedingung')
        .appendField(new Blockly.FieldTextInput('{{ states.sensor.temp > 20 }}'), 'TEMPLATE');
      this.setOutput(true, 'Boolean');
      this.setColour(60);
      this.setTooltip('Bedingung: Template prüfen.');
      this.setHelpUrl('');
    }
  };

  // Geräte-Bedingung
  Blockly.Blocks['ha_if_device'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Gerät')
        .appendField(new Blockly.FieldTextInput('switch.schlafzimmer'), 'ENTITY_ID')
        .appendField('ist')
        .appendField(new Blockly.FieldDropdown([
          ['an', 'on'],
          ['aus', 'off']
        ]), 'DEVICE_STATE');
      this.setOutput(true, 'Boolean');
      this.setColour(60);
      this.setTooltip('Bedingung: Gerätezustand prüfen.');
      this.setHelpUrl('');
    }
  };

  // Logik: UND
  Blockly.Blocks['ha_if_and'] = {
    init: function() {
      this.appendValueInput('A')
        .setCheck('Boolean')
        .appendField('UND');
      this.appendValueInput('B')
        .setCheck('Boolean');
      this.setOutput(true, 'Boolean');
      this.setColour(120);
      this.setTooltip('Logik: UND-Verknüpfung.');
      this.setHelpUrl('');
    }
  };

  // Logik: ODER
  Blockly.Blocks['ha_if_or'] = {
    init: function() {
      this.appendValueInput('A')
        .setCheck('Boolean')
        .appendField('ODER');
      this.appendValueInput('B')
        .setCheck('Boolean');
      this.setOutput(true, 'Boolean');
      this.setColour(120);
      this.setTooltip('Logik: ODER-Verknüpfung.');
      this.setHelpUrl('');
    }
  };

  // Logik: NICHT
  Blockly.Blocks['ha_if_not'] = {
    init: function() {
      this.appendValueInput('A')
        .setCheck('Boolean')
        .appendField('NICHT');
      this.setOutput(true, 'Boolean');
      this.setColour(120);
      this.setTooltip('Logik: NICHT-Verknüpfung.');
      this.setHelpUrl('');
    }
  };
} 