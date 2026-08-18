import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';

export const LightTheme = Blockly.Theme.defineTheme('ha-light', {
  name: 'ha-light',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#f4f6fb',
    toolboxBackgroundColour: '#ffffff',
    flyoutBackgroundColour: '#ffffff',
    scrollbarColour: '#c5cdd8',
    toolboxForegroundColour: '#3c4250',
    insertionMarkerColour: '#f9a825',
    insertionMarkerOpacity: 0.45,
    selectedGlowColour: '#f9a825',
  },
});

export const HaDarkTheme = Blockly.Theme.defineTheme('ha-dark', {
  name: 'ha-dark',
  base: DarkTheme,
  componentStyles: {
    workspaceBackgroundColour: '#141821',
    toolboxBackgroundColour: '#1b1f29',
    flyoutBackgroundColour: '#222733',
    scrollbarColour: '#4a5163',
    toolboxForegroundColour: '#d7dce6',
    insertionMarkerColour: '#ffca28',
    insertionMarkerOpacity: 0.5,
    selectedGlowColour: '#ffca28',
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
