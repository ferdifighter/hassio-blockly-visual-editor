import { describe, expect, it, beforeAll } from 'vitest';
import * as Blockly from 'blockly';
import { registerAllHomeAssistantBlocks } from './blocks';
import {
  applyBlocklyInteractionConfig,
  colourNeedsDarkText,
  HA_CONNECTING_SNAP_RADIUS,
  HA_CONNECTION_PREFERENCE,
  HA_SNAP_RADIUS,
} from './blocklySetup';

beforeAll(() => {
  registerAllHomeAssistantBlocks();
});

describe('Blockly-Andocken', () => {
  it('vergrößert den Fangradius gegenüber dem Blockly-Standard', () => {
    applyBlocklyInteractionConfig();
    expect(Blockly.config.snapRadius).toBe(HA_SNAP_RADIUS);
    expect(Blockly.config.connectingSnapRadius).toBe(HA_CONNECTING_SNAP_RADIUS);
    expect(Blockly.config.currentConnectionPreference).toBe(HA_CONNECTION_PREFERENCE);
    expect(HA_SNAP_RADIUS).toBeGreaterThan(28);
    expect(HA_CONNECTING_SNAP_RADIUS).toBeGreaterThan(HA_SNAP_RADIUS);
  });
});

describe('Blockly-Textkontrast', () => {
  it('setzt auf hellen Textblöcken dunkle Schrift', () => {
    const workspace = new Blockly.Workspace();
    const text = workspace.newBlock('ha_text');
    expect(colourNeedsDarkText(text.getColour())).toBe(true);
    expect(colourNeedsDarkText('#d6d4b8')).toBe(true);
    workspace.dispose();
  });

  it('lässt dunkle Trigger-Blöcke bei heller Schrift', () => {
    const workspace = new Blockly.Workspace();
    const trigger = workspace.newBlock('ha_time_trigger');
    expect(colourNeedsDarkText(trigger.getColour())).toBe(false);
    workspace.dispose();
  });
});
