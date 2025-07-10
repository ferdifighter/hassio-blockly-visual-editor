import * as Blockly from 'blockly';

export function registerServiceBlocks() {
  Blockly.Blocks['ha_call_service'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Führe Dienst aus')
        .appendField(new Blockly.FieldTextInput('homeassistant.turn_on'), 'SERVICE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(20);
      this.setTooltip('Führt einen Home Assistant Dienst aus.');
      this.setHelpUrl('');
    }
  };

  Blockly.Blocks['ha_activate_scene'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Aktiviere Szene')
        .appendField(new Blockly.FieldTextInput('szene.abend'), 'SCENE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(20);
      this.setTooltip('Aktiviert eine Szene.');
      this.setHelpUrl('');
    }
  };
} 