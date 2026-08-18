import * as Blockly from 'blockly';

/** Default Blockly snap radius is 28px – too tight for comfortable docking. */
export const HA_SNAP_RADIUS = 72;
export const HA_CONNECTING_SNAP_RADIUS = 96;
export const HA_CONNECTION_PREFERENCE = 24;

export const HA_RENDERER = 'geras';
export const LIGHT_BLOCK_TEXT_CLASS = 'ha-dark-text';

export const HA_RENDERER_OVERRIDES = {
  CORNER_RADIUS: 12,
  DARK_PATH_OFFSET: 2,
  FIELD_BORDER_RECT_RADIUS: 10,
  FIELD_BORDER_RECT_HEIGHT: 22,
  FIELD_BORDER_RECT_X_PADDING: 8,
  FIELD_BORDER_RECT_Y_PADDING: 4,
  FIELD_BORDER_RECT_COLOUR: '#ffffff',
  FIELD_DROPDOWN_BORDER_RECT_HEIGHT: 24,
  FIELD_DROPDOWN_SVG_ARROW: true,
  FIELD_DROPDOWN_COLOURED_DIV: true,
  FIELD_DROPDOWN_NO_BORDER_RECT_SHADOW: true,
  FIELD_TEXTINPUT_BOX_SHADOW: true,
};

export function applyBlocklyInteractionConfig(): void {
  Blockly.config.snapRadius = HA_SNAP_RADIUS;
  Blockly.config.connectingSnapRadius = HA_CONNECTING_SNAP_RADIUS;
  Blockly.config.currentConnectionPreference = HA_CONNECTION_PREFERENCE;
}

export function colourNeedsDarkText(colour: string): boolean {
  const parsed = Blockly.utils.colour.parse(colour);
  if (!parsed) {
    return false;
  }
  const [red, green, blue] = Blockly.utils.colour.hexToRgb(parsed);
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return contrastWithWhite < 3;
}

export function visibleBlockColour(block: Blockly.Block): string {
  const rendered = block as Blockly.BlockSvg;
  if (block.isShadow() && typeof rendered.getColourSecondary === 'function') {
    try {
      return rendered.getColourSecondary() || block.getColour();
    } catch {
      return block.getColour();
    }
  }
  return block.getColour();
}

export function syncBlockTextContrast(workspace: Blockly.Workspace): void {
  for (const block of workspace.getAllBlocks(false)) {
    const root = (block as Blockly.BlockSvg).getSvgRoot?.();
    if (!root) {
      continue;
    }
    root.classList.toggle(LIGHT_BLOCK_TEXT_CLASS, colourNeedsDarkText(visibleBlockColour(block)));
  }
}

export function attachBlockTextContrast(workspace: Blockly.WorkspaceSvg): void {
  const apply = () => {
    syncBlockTextContrast(workspace);
    const flyoutWorkspace = workspace.getFlyout()?.getWorkspace();
    if (flyoutWorkspace) {
      syncBlockTextContrast(flyoutWorkspace);
    }
  };
  workspace.addChangeListener(apply);
  apply();
}
