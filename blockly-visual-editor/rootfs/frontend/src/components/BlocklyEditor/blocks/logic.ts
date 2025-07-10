import * as Blockly from 'blockly';

export function registerLogicBlocks() {
  // If/Else Block (vereinfacht)
  Blockly.Blocks['ha_if_else'] = {
    init: function() {
      this.appendValueInput('IF0')
        .setCheck('Boolean')
        .appendField('wenn');
      this.appendStatementInput('DO0')
        .appendField('dann');
      this.appendStatementInput('ELSE')
        .appendField('sonst');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip('Steuerung: If/Else-Bedingung.');
      this.setHelpUrl('');
    }
  };

  // Repeat Block
  Blockly.Blocks['ha_repeat_while'] = {
    init: function() {
      this.appendValueInput('BOOL')
        .setCheck('Boolean')
        .appendField('wiederhole solange');
      this.appendStatementInput('DO')
        .appendField('führe aus');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip('Steuerung: While-Schleife.');
      this.setHelpUrl('');
    }
  };

  // For Each Block
  Blockly.Blocks['ha_for_each'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('für jedes Element in')
        .appendField(new Blockly.FieldTextInput('{{ states.sensor.temp.attributes }}'), 'LIST');
      this.appendStatementInput('DO')
        .appendField('führe aus');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip('Steuerung: For-Each-Schleife.');
      this.setHelpUrl('');
    }
  };

  // Break Block
  Blockly.Blocks['ha_break'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Schleife abbrechen');
      this.setPreviousStatement(true, null);
      this.setColour(210);
      this.setTooltip('Steuerung: Schleife abbrechen.');
      this.setHelpUrl('');
    }
  };

  // Continue Block
  Blockly.Blocks['ha_continue'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Schleife fortsetzen');
      this.setPreviousStatement(true, null);
      this.setColour(210);
      this.setTooltip('Steuerung: Schleife fortsetzen.');
      this.setHelpUrl('');
    }
  };
} 