import * as Blockly from 'blockly';
import { formatWeekdayLabel, formatWeekdays, parseWeekdays, WEEKDAYS } from './fieldUtils';
import { openSelectorModal } from './selectorModal';

export class WeekdayField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  static override fromJson(options: Record<string, unknown>): WeekdayField {
    const value = typeof options['value'] === 'string'
      ? options['value']
      : typeof options['text'] === 'string'
        ? options['text']
        : '';
    return new WeekdayField(value);
  }

  override getText(): string {
    return formatWeekdayLabel(this.getValue() || '');
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    const modal = openSelectorModal({
      title: 'Wochentage wählen',
      compact: true,
    });
    const selected = new Set(parseWeekdays(this.getValue() || ''));
    const form = document.createElement('div');
    form.className = 'field-picker-form';
    const list = document.createElement('div');
    list.className = 'field-picker-weekdays';

    const boxes: HTMLInputElement[] = [];
    for (const day of WEEKDAYS) {
      const wrap = document.createElement('label');
      wrap.className = 'field-picker-check';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.value = day.id;
      box.checked = selected.has(day.id);
      boxes.push(box);
      wrap.appendChild(box);
      wrap.appendChild(document.createTextNode(` ${day.label}`));
      list.appendChild(wrap);
    }
    form.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'field-picker-actions';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.textContent = 'Übernehmen';
    apply.addEventListener('click', () => {
      this.setValue(formatWeekdays(boxes.filter((box) => box.checked).map((box) => box.value)));
      modal.close();
    });
    actions.appendChild(apply);
    form.appendChild(actions);
    modal.content.appendChild(form);
  }
}
