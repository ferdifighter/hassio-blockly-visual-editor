import { describe, expect, it } from 'vitest';
import {
  formatDateTimeLabel,
  formatDuration,
  formatDurationLabel,
  formatWeekdayLabel,
  labelForEvent,
  labelForState,
  normalizeTime,
  parseDuration,
  parseWeekdays,
} from './blocks/fieldUtils';

describe('Picker-Hilfsfunktionen', () => {
  it('normalisiert Uhrzeiten', () => {
    expect(normalizeTime('7:05')).toBe('07:05');
    expect(normalizeTime('07:05:00')).toBe('07:05');
  });

  it('formatiert Dauern lesbar', () => {
    expect(parseDuration('00:05:00')).toEqual({ negative: false, hours: 0, minutes: 5, seconds: 0 });
    expect(formatDuration({ negative: true, hours: 0, minutes: 15, seconds: 0 })).toBe('-00:15:00');
    expect(formatDurationLabel('00:01:30')).toBe('1 Min. 30 Sek.');
    expect(formatDurationLabel('')).toBe('Dauer wählen');
  });

  it('formatiert Wochentage', () => {
    expect(parseWeekdays('mon, fri')).toEqual(['mon', 'fri']);
    expect(formatWeekdayLabel('mon,tue,wed,thu,fri')).toBe('Mo, Di, Mi, Do, Fr');
    expect(formatWeekdayLabel('')).toBe('jeden Tag');
  });

  it('übersetzt Zustände und Ereignisse', () => {
    expect(labelForState('on')).toBe('Ein');
    expect(labelForState('')).toBe('Zustand wählen');
    expect(labelForEvent('state_changed')).toBe('Zustandsänderung');
  });

  it('formatiert Datum und Uhrzeit für die Anzeige', () => {
    expect(formatDateTimeLabel('2026-08-13 11:13')).toBe('13.08.2026 11:13');
    expect(formatDateTimeLabel('')).toBe('Datum/Uhrzeit wählen');
  });
});
