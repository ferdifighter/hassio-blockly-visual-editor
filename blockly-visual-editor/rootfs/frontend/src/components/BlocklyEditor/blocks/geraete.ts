import * as Blockly from 'blockly';

export function registerGeraeteBlocks() {
  Blockly.Blocks['ha_light_on'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Schalte Licht ein')
        .appendField(new Blockly.FieldTextInput('licht.wohnzimmer'), 'ENTITY_ID');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(40);
      this.setTooltip('Schaltet ein Licht ein.');
      this.setHelpUrl('');
    }
  };

  Blockly.Blocks['ha_switch_toggle'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Schalte Schalter um')
        .appendField(new Blockly.FieldTextInput('schalter.garten'), 'ENTITY_ID');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(40);
      this.setTooltip('Schaltet einen Schalter um.');
      this.setHelpUrl('');
    }
  };

  Blockly.Blocks['ha_sensor_value'] = {
    init: function() {
      this.appendDummyInput()
        .appendField('Lese Sensorwert von')
        .appendField(new Blockly.FieldTextInput('sensor.temperatur'), 'ENTITY_ID');
      this.setOutput(true, null);
      this.setColour(40);
      this.setTooltip('Liest den Wert eines Sensors.');
      this.setHelpUrl('');
    }
  };
} 