import * as Blockly from 'blockly';

export function registerNotificationBlocks() {
  Blockly.Blocks['ha_send_push'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Sende Push-Nachricht')
        .appendField(new Blockly.FieldTextInput('Alarm ausgelöst!'), 'MESSAGE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Sendet eine Push-Nachricht.');
      this.setHelpUrl('');
    }
  };

  Blockly.Blocks['ha_send_tts'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Spiele TTS')
        .appendField(new Blockly.FieldTextInput('Willkommen zuhause!'), 'MESSAGE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Spielt eine Sprachnachricht ab.');
      this.setHelpUrl('');
    }
  };

  Blockly.Blocks['ha_send_email'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Sende E-Mail mit Betreff')
        .appendField(new Blockly.FieldTextInput('Statusbericht'), 'SUBJECT')
        .appendField('und Text')
        .appendField(new Blockly.FieldTextInput('Alles OK'), 'BODY');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Sendet eine E-Mail.');
      this.setHelpUrl('');
    }
  };
} 