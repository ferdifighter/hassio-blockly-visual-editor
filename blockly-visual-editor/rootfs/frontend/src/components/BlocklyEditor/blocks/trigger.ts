import * as Blockly from 'blockly';

export function registerTriggerBlocks() {
  // Zeit-Trigger
  Blockly.Blocks['ha_time_trigger'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Wenn Zeit ist')
        .appendField(new Blockly.FieldTextInput('07:00'), 'TIME');
      this.appendStatementInput('DO')
        .setCheck(null)
        .appendField('mache');
      this.setColour(210);
      this.setTooltip('Löst zu einer bestimmten Uhrzeit aus.');
      this.setHelpUrl('');
    }
  };

  // Zustand-Trigger
  Blockly.Blocks['ha_state_trigger'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Wenn Zustand von')
        .appendField(new Blockly.FieldTextInput('sensor.bewegung'), 'ENTITY_ID')
        .appendField('von')
        .appendField(new Blockly.FieldTextInput(''), 'FROM')
        .appendField('nach')
        .appendField(new Blockly.FieldTextInput('an'), 'TO');
      this.appendDummyInput()
        .appendField('für (optional)')
        .appendField(new Blockly.FieldTextInput(''), 'FOR');
      this.appendStatementInput('DO')
        .setCheck(null)
        .appendField('mache');
      this.setColour(210);
      this.setTooltip('Löst bei Statusänderung aus.');
      this.setHelpUrl('');
    }
  };

  // Ereignis-Trigger
  Blockly.Blocks['ha_event_trigger'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Wenn Ereignis')
        .appendField(new Blockly.FieldTextInput('button_pressed'), 'EVENT_TYPE');
      this.appendDummyInput()
        .appendField('Event-Daten (optional)')
        .appendField(new Blockly.FieldTextInput(''), 'EVENT_DATA');
      this.appendStatementInput('DO')
        .setCheck(null)
        .appendField('mache');
      this.setColour(210);
      this.setTooltip('Löst bei einem bestimmten Ereignis aus.');
      this.setHelpUrl('');
    }
  };

  // Webhook-Trigger
  Blockly.Blocks['ha_webhook_trigger'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Wenn Webhook empfangen')
        .appendField(new Blockly.FieldTextInput('meine_webhook_id'), 'WEBHOOK_ID');
      this.appendStatementInput('DO')
        .setCheck(null)
        .appendField('mache');
      this.setColour(210);
      this.setTooltip('Löst bei Aufruf eines Webhooks aus.');
      this.setHelpUrl('');
    }
  };

  // Sun-Trigger
  Blockly.Blocks['ha_sun_trigger'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Wenn Sonne')
        .appendField(new Blockly.FieldDropdown([
          ['aufgeht', 'sunrise'],
          ['untergeht', 'sunset']
        ]), 'SUN_EVENT');
      this.appendDummyInput()
        .appendField('Offset (optional)')
        .appendField(new Blockly.FieldTextInput(''), 'OFFSET');
      this.appendStatementInput('DO')
        .setCheck(null)
        .appendField('mache');
      this.setColour(210);
      this.setTooltip('Löst bei Sonnenaufgang oder Sonnenuntergang aus.');
      this.setHelpUrl('');
    }
  };

  // Template-Trigger
  Blockly.Blocks['ha_template_trigger'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Wenn Template wahr wird')
        .appendField(new Blockly.FieldTextInput('{{ states.sensor.temp > 20 }}'), 'TEMPLATE');
      this.appendStatementInput('DO')
        .setCheck(null)
        .appendField('mache');
      this.setColour(210);
      this.setTooltip('Löst aus, wenn ein Template wahr wird.');
      this.setHelpUrl('');
    }
  };

  // Geräte-Trigger
  Blockly.Blocks['ha_device_trigger'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Wenn Gerät')
        .appendField(new Blockly.FieldTextInput('switch.schlafzimmer'), 'ENTITY_ID')
        .appendField('ausgelöst wird vom Typ')
        .appendField(new Blockly.FieldDropdown([
          ['eingeschaltet', 'turned_on'],
          ['ausgeschaltet', 'turned_off'],
          ['gedimmt', 'dimmed']
        ]), 'DEVICE_TYPE');
      this.appendStatementInput('DO')
        .setCheck(null)
        .appendField('mache');
      this.setColour(210);
      this.setTooltip('Löst bei Geräteereignis aus.');
      this.setHelpUrl('');
    }
  };
} 