import * as Blockly from 'blockly';
import { formatDateTime, formatDateTimeLabel, parseDateTime } from './fieldUtils';
import { openSelectorModal } from './selectorModal';

export class DateTimeField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  static override fromJson(options: Record<string, unknown>): DateTimeField {
    const value = typeof options['value'] === 'string'
      ? options['value']
      : typeof options['text'] === 'string'
        ? options['text']
        : '';
    return new DateTimeField(value);
  }

  override getText(): string {
    return formatDateTimeLabel(this.getValue() || '');
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    const modal = openSelectorModal({
      title: 'Datum und Uhrzeit wählen',
      compact: true,
    });
    const current = parseDateTime(this.getValue() || '');

    const form = document.createElement('div');
    form.className = 'field-picker-form';

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = current.date;

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.step = '60';
    timeInput.value = current.time;

    form.appendChild(labeled('Datum', dateInput));
    form.appendChild(labeled('Uhrzeit', timeInput));

    const actions = document.createElement('div');
    actions.className = 'field-picker-actions';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.textContent = 'Übernehmen';
    apply.addEventListener('click', () => {
      this.setValue(formatDateTime(dateInput.value || current.date, timeInput.value || current.time));
      modal.close();
    });
    actions.appendChild(apply);
    form.appendChild(actions);
    modal.content.appendChild(form);
    dateInput.focus();
  }
}

export class DateField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  static override fromJson(options: Record<string, unknown>): DateField {
    const value = typeof options['value'] === 'string'
      ? options['value']
      : typeof options['text'] === 'string'
        ? options['text']
        : '';
    return new DateField(value);
  }

  override getText(): string {
    const value = this.getValue() || '';
    if (!value) {
      return 'Datum wählen';
    }
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}.${month}.${year}` : value;
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    const modal = openSelectorModal({
      title: 'Datum wählen',
      compact: true,
    });
    const form = document.createElement('div');
    form.className = 'field-picker-form';
    const input = document.createElement('input');
    input.type = 'date';
    input.value = this.getValue() || parseDateTime('').date;
    form.appendChild(input);

    const actions = document.createElement('div');
    actions.className = 'field-picker-actions';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.textContent = 'Übernehmen';
    apply.addEventListener('click', () => {
      this.setValue(input.value);
      modal.close();
    });
    actions.appendChild(apply);
    form.appendChild(actions);
    modal.content.appendChild(form);
    input.focus();
  }
}

function labeled(label: string, input: HTMLElement): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'field-picker-label';
  wrap.textContent = label;
  wrap.appendChild(input);
  return wrap;
}
