import * as Blockly from 'blockly';
import { EntityField } from './EntityField';

export function registerActionBlocks() {
  // Service-Aufruf
  Blockly.Blocks['ha_call_service'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Service aufrufen')
        .appendField(new Blockly.FieldTextInput('light.turn_on'), 'SERVICE');
      this.appendDummyInput()
        .appendField('Entity ID')
        .appendField(new Blockly.FieldTextInput('light.wohnzimmer'), 'ENTITY_ID');
      this.appendDummyInput()
        .appendField('Daten (optional)')
        .appendField(new Blockly.FieldTextInput('{"brightness": 255}'), 'SERVICE_DATA');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Aktion: Service aufrufen.');
      this.setHelpUrl('');
    }
  };

  // Szene aktivieren
  Blockly.Blocks['ha_activate_scene'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Szene aktivieren')
        .appendField(new Blockly.FieldTextInput('scene.wohnzimmer_abend'), 'SCENE_ID');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Aktion: Szene aktivieren.');
      this.setHelpUrl('');
    }
  };

  // Benachrichtigung senden
  Blockly.Blocks['ha_notify'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Benachrichtigung senden')
        .appendField(new EntityField('mobile_app_iphone'), 'NOTIFY_SERVICE');
      this.appendDummyInput()
        .appendField('Nachricht')
        .appendField(new Blockly.FieldTextInput('Tür wurde geöffnet!'), 'MESSAGE');
      this.appendDummyInput()
        .appendField('Titel (optional)')
        .appendField(new Blockly.FieldTextInput(''), 'TITLE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Aktion: Benachrichtigung senden. Klicke auf das Feld um eine Entität auszuwählen.');
      this.setHelpUrl('');
    }
  };

  // Verzögerung
  Blockly.Blocks['ha_delay'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Verzögerung')
        .appendField(new Blockly.FieldTextInput('00:00:30'), 'DELAY_TIME');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Aktion: Verzögerung einbauen.');
      this.setHelpUrl('');
    }
  };

  // Warten auf Zustand
  Blockly.Blocks['ha_wait_for_state'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Warten auf Zustand')
        .appendField(new Blockly.FieldTextInput('sensor.temperatur'), 'ENTITY_ID')
        .appendField('ist')
        .appendField(new Blockly.FieldTextInput('über 20'), 'STATE');
      this.appendDummyInput()
        .appendField('Timeout (optional)')
        .appendField(new Blockly.FieldTextInput('00:05:00'), 'TIMEOUT');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Aktion: Auf Zustand warten.');
      this.setHelpUrl('');
    }
  };

  // Warten auf Template
  Blockly.Blocks['ha_wait_for_template'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Warten auf Template')
        .appendField(new Blockly.FieldTextInput('{{ states.sensor.temp > 20 }}'), 'TEMPLATE');
      this.appendDummyInput()
        .appendField('Timeout (optional)')
        .appendField(new Blockly.FieldTextInput('00:05:00'), 'TIMEOUT');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Aktion: Auf Template warten.');
      this.setHelpUrl('');
    }
  };

  // Wiederholen
  Blockly.Blocks['ha_repeat'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Wiederholen')
        .appendField(new Blockly.FieldTextInput('5'), 'COUNT')
        .appendField('mal');
      this.appendStatementInput('DO')
        .setCheck(null);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Aktion: Aktionen wiederholen.');
      this.setHelpUrl('');
    }
  };

  // Variable setzen
  Blockly.Blocks['ha_set_variable'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Variable setzen')
        .appendField(new Blockly.FieldTextInput('temp_value'), 'VARIABLE_NAME')
        .appendField('=')
        .appendField(new Blockly.FieldTextInput('{{ states.sensor.temp.state }}'), 'VALUE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Aktion: Variable setzen.');
      this.setHelpUrl('');
    }
  };

  // Template ausführen
  Blockly.Blocks['ha_execute_template'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Template ausführen')
        .appendField(new Blockly.FieldTextInput('{{ log("Temperatur: " + states.sensor.temp.state) }}'), 'TEMPLATE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Aktion: Template ausführen.');
      this.setHelpUrl('');
    }
  };

  // Stoppen
  Blockly.Blocks['ha_stop'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Automatisierung stoppen');
      this.setPreviousStatement(true, null);
      this.setColour(160);
      this.setTooltip('Aktion: Automatisierung stoppen.');
      this.setHelpUrl('');
    }
  };
} 