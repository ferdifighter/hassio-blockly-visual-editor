import * as Blockly from 'blockly';
import { formatDuration, formatDurationLabel, parseDuration } from './fieldUtils';
import { openSelectorModal } from './selectorModal';

export class DurationField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  private allowNegative = false;

  static override fromJson(options: Record<string, unknown>): DurationField {
    const value = typeof options['value'] === 'string'
      ? options['value']
      : typeof options['text'] === 'string'
        ? options['text']
        : '';
    const field = new DurationField(value);
    field.allowNegative = options['allowNegative'] === true;
    return field;
  }

  override getText(): string {
    return formatDurationLabel(this.getValue() || '');
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    const modal = openSelectorModal({
      title: 'Dauer wählen',
      compact: true,
    });
    const current = parseDuration(this.getValue() || '');

    const form = document.createElement('div');
    form.className = 'field-picker-form';

    const row = document.createElement('div');
    row.className = 'field-picker-duration';
    const hours = numberInput(current.hours, 0, 999);
    const minutes = numberInput(current.minutes, 0, 59);
    const seconds = numberInput(current.seconds, 0, 59);
    row.appendChild(labeled('Stunden', hours));
    row.appendChild(labeled('Minuten', minutes));
    row.appendChild(labeled('Sekunden', seconds));
    form.appendChild(row);

    let negative: HTMLInputElement | null = null;
    if (this.allowNegative) {
      const wrap = document.createElement('label');
      wrap.className = 'field-picker-check';
      negative = document.createElement('input');
      negative.type = 'checkbox';
      negative.checked = current.negative;
      wrap.appendChild(negative);
      wrap.appendChild(document.createTextNode(' davor (negativer Offset)'));
      form.appendChild(wrap);
    }

    const actions = document.createElement('div');
    actions.className = 'field-picker-actions';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Leeren';
    clear.addEventListener('click', () => {
      this.setValue('');
      modal.close();
    });
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.textContent = 'Übernehmen';
    apply.addEventListener('click', () => {
      this.setValue(formatDuration({
        negative: Boolean(negative?.checked),
        hours: Number(hours.value) || 0,
        minutes: Number(minutes.value) || 0,
        seconds: Number(seconds.value) || 0,
      }));
      modal.close();
    });
    actions.appendChild(clear);
    actions.appendChild(apply);
    form.appendChild(actions);
    modal.content.appendChild(form);
    hours.focus();
  }
}

function numberInput(value: number, min: number, max: number): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);
  return input;
}

function labeled(label: string, input: HTMLElement): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'field-picker-label';
  wrap.textContent = label;
  wrap.appendChild(input);
  return wrap;
}
