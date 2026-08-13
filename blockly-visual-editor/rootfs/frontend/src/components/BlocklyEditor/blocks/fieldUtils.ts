import type * as Blockly from 'blockly';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function refreshPickerFields(workspace: Blockly.Workspace): void {
  for (const block of workspace.getAllBlocks(false)) {
    for (const input of block.inputList) {
      for (const field of input.fieldRow) {
        if (typeof (field as { forceRerender?: () => void }).forceRerender === 'function') {
          (field as { forceRerender: () => void }).forceRerender();
        }
      }
    }
  }
}

export function normalizeTime(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return value.trim();
  }
  const hours = String(Math.min(23, Number(match[1]))).padStart(2, '0');
  const minutes = String(Math.min(59, Number(match[2]))).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function timeInputValue(value: string): string {
  const normalized = normalizeTime(value);
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : '07:00';
}

export interface DurationParts {
  negative: boolean;
  hours: number;
  minutes: number;
  seconds: number;
}

export function parseDuration(value: string): DurationParts {
  const trimmed = value.trim();
  if (!trimmed) {
    return { negative: false, hours: 0, minutes: 0, seconds: 0 };
  }
  const negative = trimmed.startsWith('-');
  const raw = negative ? trimmed.slice(1) : trimmed;
  const match = raw.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    return {
      negative,
      hours: Number(match[1]) || 0,
      minutes: Math.min(59, Number(match[2]) || 0),
      seconds: Math.min(59, Number(match[3] || 0)),
    };
  }
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    const total = Math.round(asNumber);
    return {
      negative,
      hours: Math.floor(total / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };
  }
  return { negative: false, hours: 0, minutes: 0, seconds: 0 };
}

export function formatDuration(parts: DurationParts): string {
  const hours = String(Math.max(0, parts.hours)).padStart(2, '0');
  const minutes = String(Math.min(59, Math.max(0, parts.minutes))).padStart(2, '0');
  const seconds = String(Math.min(59, Math.max(0, parts.seconds))).padStart(2, '0');
  const body = `${hours}:${minutes}:${seconds}`;
  if (parts.hours === 0 && parts.minutes === 0 && parts.seconds === 0) {
    return parts.negative ? `-${body}` : body;
  }
  return parts.negative ? `-${body}` : body;
}

export function formatDurationLabel(value: string): string {
  if (!value.trim()) {
    return 'Dauer wählen';
  }
  const parts = parseDuration(value);
  const bits: string[] = [];
  if (parts.hours) bits.push(`${parts.hours} Std.`);
  if (parts.minutes) bits.push(`${parts.minutes} Min.`);
  if (parts.seconds || bits.length === 0) bits.push(`${parts.seconds} Sek.`);
  return `${parts.negative ? '− ' : ''}${bits.join(' ')}`;
}

export const WEEKDAYS: Array<{ id: string; label: string; short: string }> = [
  { id: 'mon', label: 'Montag', short: 'Mo' },
  { id: 'tue', label: 'Dienstag', short: 'Di' },
  { id: 'wed', label: 'Mittwoch', short: 'Mi' },
  { id: 'thu', label: 'Donnerstag', short: 'Do' },
  { id: 'fri', label: 'Freitag', short: 'Fr' },
  { id: 'sat', label: 'Samstag', short: 'Sa' },
  { id: 'sun', label: 'Sonntag', short: 'So' },
];

export function parseWeekdays(value: string): string[] {
  const allowed = new Set(WEEKDAYS.map((day) => day.id));
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => allowed.has(item));
}

export function formatWeekdays(ids: string[]): string {
  return WEEKDAYS.filter((day) => ids.includes(day.id)).map((day) => day.id).join(',');
}

export function formatWeekdayLabel(value: string): string {
  const selected = parseWeekdays(value);
  if (!selected.length) {
    return 'jeden Tag';
  }
  return WEEKDAYS.filter((day) => selected.includes(day.id)).map((day) => day.short).join(', ');
}

export function parseDateTime(value: string): { date: string; time: string } {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?$/);
  if (match) {
    return { date: match[1], time: match[2] };
  }
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timeMatch = value.trim().match(/^(\d{2}:\d{2})/);
  return { date, time: timeMatch ? timeMatch[1] : '07:00' };
}

export function formatDateTime(date: string, time: string): string {
  return `${date} ${normalizeTime(time)}`;
}

export function formatDateTimeLabel(value: string): string {
  if (!value.trim()) {
    return 'Datum/Uhrzeit wählen';
  }
  const { date, time } = parseDateTime(value);
  const [year, month, day] = date.split('-');
  if (year && month && day) {
    return `${day}.${month}.${year} ${time}`;
  }
  return value;
}

export const STATE_LABELS: Record<string, string> = {
  on: 'Ein',
  off: 'Aus',
  home: 'Zuhause',
  not_home: 'Unterwegs',
  open: 'Offen',
  closed: 'Geschlossen',
  opening: 'Öffnet',
  closing: 'Schließt',
  locked: 'Verriegelt',
  unlocked: 'Entriegelt',
  playing: 'Wiedergabe',
  paused: 'Pausiert',
  idle: 'Leerlauf',
  heat: 'Heizen',
  cool: 'Kühlen',
  auto: 'Auto',
  dry: 'Entfeuchten',
  fan_only: 'Nur Lüfter',
  docked: 'In der Station',
  cleaning: 'Reinigt',
  returning: 'Kehrt zurück',
  disarmed: 'Unscharf',
  armed_home: 'Scharf (Zuhause)',
  armed_away: 'Scharf (Abwesend)',
  triggered: 'Ausgelöst',
  above_horizon: 'Über dem Horizont',
  below_horizon: 'Unter dem Horizont',
  unavailable: 'Nicht verfügbar',
  unknown: 'Unbekannt',
};

export const DOMAIN_STATES: Record<string, string[]> = {
  light: ['on', 'off'],
  switch: ['on', 'off'],
  input_boolean: ['on', 'off'],
  fan: ['on', 'off'],
  binary_sensor: ['on', 'off'],
  cover: ['open', 'closed', 'opening', 'closing'],
  lock: ['locked', 'unlocked'],
  person: ['home', 'not_home'],
  device_tracker: ['home', 'not_home'],
  media_player: ['playing', 'paused', 'idle', 'off', 'on'],
  climate: ['heat', 'cool', 'off', 'auto', 'dry', 'fan_only'],
  vacuum: ['docked', 'cleaning', 'returning', 'idle', 'paused'],
  alarm_control_panel: ['disarmed', 'armed_home', 'armed_away', 'triggered'],
  sun: ['above_horizon', 'below_horizon'],
};

export function labelForState(state: string): string {
  if (!state) {
    return 'Zustand wählen';
  }
  return STATE_LABELS[state] || state;
}

export const COMMON_EVENTS = [
  { id: 'state_changed', label: 'Zustandsänderung' },
  { id: 'call_service', label: 'Service-Aufruf' },
  { id: 'button.press', label: 'Tastendruck' },
  { id: 'zha_event', label: 'ZHA-Ereignis' },
  { id: 'hue_event', label: 'Hue-Ereignis' },
  { id: 'ios.action_fired', label: 'iOS-Aktion' },
  { id: 'mobile_app_notification_action', label: 'Push-Aktion' },
  { id: 'automation_triggered', label: 'Automatisierung ausgelöst' },
  { id: 'timer.finished', label: 'Timer abgelaufen' },
  { id: 'tag_scanned', label: 'Tag gescannt' },
  { id: 'mqtt_message', label: 'MQTT-Nachricht' },
];

export function labelForEvent(eventType: string): string {
  if (!eventType) {
    return 'Ereignis wählen';
  }
  return COMMON_EVENTS.find((event) => event.id === eventType)?.label || eventType;
}

export const DOMAIN_LABELS: Record<string, string> = {
  light: 'Licht',
  switch: 'Schalter',
  scene: 'Szene',
  cover: 'Beschattung',
  climate: 'Klima',
  fan: 'Lüfter',
  lock: 'Schloss',
  media_player: 'Medien',
  vacuum: 'Staubsauger',
  camera: 'Kamera',
  alarm_control_panel: 'Alarmanlage',
  notify: 'Benachrichtigung',
  homeassistant: 'Home Assistant',
  script: 'Skript',
  automation: 'Automatisierung',
  input_boolean: 'Schalter (Helfer)',
  input_select: 'Auswahl (Helfer)',
  input_number: 'Zahl (Helfer)',
  input_datetime: 'Datum/Zeit (Helfer)',
  button: 'Taster',
  number: 'Zahl',
  select: 'Auswahl',
  siren: 'Sirene',
  humidifier: 'Luftbefeuchter',
  water_heater: 'Warmwasser',
  lawn_mower: 'Mäher',
  valve: 'Ventil',
  remote: 'Fernbedienung',
  calendar: 'Kalender',
  person: 'Person',
  device_tracker: 'Standort',
  binary_sensor: 'Binärsensor',
  sensor: 'Sensor',
  weather: 'Wetter',
  sun: 'Sonne',
  zone: 'Zone',
  timer: 'Timer',
  counter: 'Zähler',
  todo: 'Aufgaben',
};
