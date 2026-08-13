import * as Blockly from 'blockly';
import { normalizeTime, timeInputValue } from './fieldUtils';
import { openSelectorModal } from './selectorModal';

export class TimeField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  static override fromJson(options: Record<string, unknown>): TimeField {
    const value = typeof options['value'] === 'string'
      ? options['value']
      : typeof options['text'] === 'string'
        ? options['text']
        : '07:00';
    return new TimeField(value);
  }

  override getText(): string {
    const value = this.getValue() || '';
    return value ? normalizeTime(value) : 'Uhrzeit wählen';
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    const modal = openSelectorModal({
      title: 'Uhrzeit wählen',
      compact: true,
    });

    const form = document.createElement('div');
    form.className = 'field-picker-form';
    const input = document.createElement('input');
    input.type = 'time';
    input.step = '60';
    input.value = timeInputValue(this.getValue() || '');
    form.appendChild(input);

    const actions = document.createElement('div');
    actions.className = 'field-picker-actions';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.textContent = 'Übernehmen';
    apply.addEventListener('click', () => {
      this.setValue(normalizeTime(input.value || '07:00'));
      modal.close();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        apply.click();
      }
    });
    actions.appendChild(apply);
    form.appendChild(actions);
    modal.content.appendChild(form);
    input.focus();
  }
}
