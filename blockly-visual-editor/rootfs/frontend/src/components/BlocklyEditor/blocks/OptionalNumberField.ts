import * as Blockly from 'blockly';
import { openSelectorModal } from './selectorModal';

export class OptionalNumberField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  static override fromJson(options: Record<string, unknown>): OptionalNumberField {
    const value = options['value'] ?? options['text'] ?? '';
    return new OptionalNumberField(value === null || value === undefined ? '' : String(value));
  }

  override getText(): string {
    const value = this.getValue() || '';
    return value || '—';
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    const modal = openSelectorModal({
      title: 'Zahl eingeben',
      compact: true,
    });
    const form = document.createElement('div');
    form.className = 'field-picker-form';
    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.value = this.getValue() || '';
    form.appendChild(input);

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
      this.setValue(input.value.trim());
      modal.close();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        apply.click();
      }
    });
    actions.appendChild(clear);
    actions.appendChild(apply);
    form.appendChild(actions);
    modal.content.appendChild(form);
    input.focus();
  }
}
