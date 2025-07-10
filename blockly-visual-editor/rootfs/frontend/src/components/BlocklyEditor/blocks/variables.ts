import * as Blockly from 'blockly';

export function registerVariableBlocks() {
  Blockly.Blocks['ha_set_variable'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Setze Variable')
        .appendField(new Blockly.FieldTextInput('zaehler'), 'NAME')
        .appendField('auf')
        .appendField(new Blockly.FieldTextInput('1'), 'VALUE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(30);
      this.setTooltip('Setzt eine Variable.');
      this.setHelpUrl('');
    }
  };

  Blockly.Blocks['ha_get_variable'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Lese Variable')
        .appendField(new Blockly.FieldTextInput('zaehler'), 'NAME');
      this.setOutput(true, null);
      this.setColour(30);
      this.setTooltip('Liest eine Variable.');
      this.setHelpUrl('');
    }
  };

  Blockly.Blocks['ha_increment_variable'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Erhöhe Variable')
        .appendField(new Blockly.FieldTextInput('zaehler'), 'NAME');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(30);
      this.setTooltip('Erhöht eine Variable um 1.');
      this.setHelpUrl('');
    }
  };
} 