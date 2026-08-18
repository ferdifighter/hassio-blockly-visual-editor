import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import {
  applyBlocklyInteractionConfig,
  HA_CONNECTING_SNAP_RADIUS,
  HA_CONNECTION_PREFERENCE,
  HA_SNAP_RADIUS,
} from './blocklySetup';

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
