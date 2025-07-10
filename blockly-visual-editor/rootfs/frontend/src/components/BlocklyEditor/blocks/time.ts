import * as Blockly from 'blockly';

export function registerTimeBlocks() {
  Blockly.Blocks['ha_delay'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Verzögere um')
        .appendField(new Blockly.FieldNumber(30, 0), 'SECONDS')
        .appendField('Sekunden');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(200);
      this.setTooltip('Verzögert die Ausführung.');
      this.setHelpUrl('');
    }
  };

  Blockly.Blocks['ha_time_window'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Zeitfenster von')
        .appendField(new Blockly.FieldTextInput('06:00'), 'START')
        .appendField('bis')
        .appendField(new Blockly.FieldTextInput('22:00'), 'END');
      this.setOutput(true, 'Boolean');
      this.setColour(200);
      this.setTooltip('Prüft, ob aktuelle Zeit im Fenster liegt.');
      this.setHelpUrl('');
    }
  };

  Blockly.Blocks['ha_repeat'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Wiederhole alle')
        .appendField(new Blockly.FieldNumber(5, 1), 'MINUTES')
        .appendField('Minuten');
      this.appendStatementInput('DO')
        .setCheck(null)
        .appendField('mache');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(200);
      this.setTooltip('Wiederholt die Aktion in Intervallen.');
      this.setHelpUrl('');
    }
  };
} 