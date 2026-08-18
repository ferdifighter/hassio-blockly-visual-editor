import * as Blockly from 'blockly';

const PLUS_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="#fff" d="M7 2h2v12H7z"/><path fill="#fff" d="M2 7h12v2H2z"/></svg>',
  );
const MINUS_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="#fff" d="M2 7h12v2H2z"/></svg>',
  );

type JoinBlock = Blockly.Block & {
  itemCount_: number;
  updateShape_: () => void;
  addPart_: () => void;
  removePart_: () => void;
};

export function registerTextBlocks(): void {
  if (Blockly.Blocks['ha_text_join']) {
    return;
  }

  Blockly.Blocks['ha_text_join'] = {
    itemCount_: 3,
    init(this: JoinBlock) {
      this.itemCount_ = 3;
      this.setColour(65);
      this.setOutput(true, 'Text');
      this.setInputsInline(false);
      this.setTooltip('Erstellt einen Text aus mehreren Teilen, genau wie in ioBroker Blockly.');
      this.appendDummyInput('HEADER')
        .appendField('erstelle Text aus')
        .appendField(
          new Blockly.FieldDropdown([
            ['mit Leerzeichen', 'space'],
            ['mit neuer Zeile', 'nl'],
            ['ohne Trenner', 'none'],
          ]),
          'SEP',
        );
      this.updateShape_();
    },
    saveExtraState(this: JoinBlock) {
      return { itemCount: this.itemCount_ };
    },
    loadExtraState(this: JoinBlock, state: { itemCount?: number }) {
      this.itemCount_ = Math.max(2, Number(state?.itemCount) || 3);
      this.updateShape_();
    },
    addPart_(this: JoinBlock) {
      if (this.itemCount_ >= 12) {
        return;
      }
      this.itemCount_ += 1;
      this.updateShape_();
    },
    removePart_(this: JoinBlock) {
      if (this.itemCount_ <= 2) {
        return;
      }
      this.itemCount_ -= 1;
      this.updateShape_();
    },
    updateShape_(this: JoinBlock) {
      if (this.getInput('CONTROLS')) {
        this.removeInput('CONTROLS');
      }
      let index = 0;
      while (this.getInput(`ADD${index}`)) {
        if (index >= this.itemCount_) {
          this.removeInput(`ADD${index}`);
        }
        index += 1;
      }
      for (let i = 0; i < this.itemCount_; i += 1) {
        if (!this.getInput(`ADD${i}`)) {
          this.appendValueInput(`ADD${i}`).setAlign(Blockly.inputs.Align.RIGHT);
        }
      }
      this.appendDummyInput('CONTROLS')
        .appendField(new Blockly.FieldImage(PLUS_ICON, 16, 16, '+', () => this.addPart_()))
        .appendField(new Blockly.FieldImage(MINUS_ICON, 16, 16, '-', () => this.removePart_()));
      this.setInputsInline(false);
    },
  };
}
