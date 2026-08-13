import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';

export const LightTheme = Blockly.Theme.defineTheme('ha-light', {
  name: 'ha-light',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#f4f6fb',
    toolboxBackgroundColour: '#eef1f6',
    flyoutBackgroundColour: '#ffffff',
    scrollbarColour: '#c5cdd8',
  },
});

export const HaDarkTheme = Blockly.Theme.defineTheme('ha-dark', {
  name: 'ha-dark',
  base: DarkTheme,
  componentStyles: {
    workspaceBackgroundColour: '#1e1e1e',
    toolboxBackgroundColour: '#252526',
    flyoutBackgroundColour: '#2d2d2d',
    scrollbarColour: '#5a5a5a',
  },
});

export function resolveBlocklyTheme(theme: 'light' | 'dark' | 'auto'): Blockly.Theme {
  if (theme === 'dark') {
    return HaDarkTheme;
  }
  if (theme === 'light') {
    return LightTheme;
  }
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return HaDarkTheme;
  }
  return LightTheme;
}
