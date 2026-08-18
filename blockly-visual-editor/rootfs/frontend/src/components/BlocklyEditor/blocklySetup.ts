import * as Blockly from 'blockly';

/** Default Blockly snap radius is 28px – too tight for comfortable docking. */
export const HA_SNAP_RADIUS = 72;
export const HA_CONNECTING_SNAP_RADIUS = 96;
export const HA_CONNECTION_PREFERENCE = 24;

export const HA_RENDERER = 'geras';

export const HA_RENDERER_OVERRIDES = {
  CORNER_RADIUS: 12,
  DARK_PATH_OFFSET: 2,
};

export function applyBlocklyInteractionConfig(): void {
  Blockly.config.snapRadius = HA_SNAP_RADIUS;
  Blockly.config.connectingSnapRadius = HA_CONNECTING_SNAP_RADIUS;
  Blockly.config.currentConnectionPreference = HA_CONNECTION_PREFERENCE;
}
