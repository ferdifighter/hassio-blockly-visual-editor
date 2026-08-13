import * as Blockly from 'blockly';
import { COMMON_EVENTS, escapeHtml, labelForEvent } from './fieldUtils';
import { openSelectorModal, renderSearchableTable } from './selectorModal';

export class EventTypeField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  static override fromJson(options: Record<string, unknown>): EventTypeField {
    const value = typeof options['value'] === 'string'
      ? options['value']
      : typeof options['text'] === 'string'
        ? options['text']
        : '';
    return new EventTypeField(value);
  }

  override getText(): string {
    return labelForEvent(this.getValue() || '');
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    const modal = openSelectorModal({
      title: 'Ereignis wählen',
      searchPlaceholder: 'Ereignis suchen…',
      compact: true,
    });

    const customWrap = document.createElement('div');
    customWrap.className = 'field-picker-custom';
    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.placeholder = 'Eigenes Ereignis, z. B. zha_event';
    customInput.value = this.getValue() || '';
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.textContent = 'Übernehmen';
    applyBtn.addEventListener('click', () => {
      this.setValue(customInput.value.trim());
      modal.close();
    });
    customWrap.appendChild(customInput);
    customWrap.appendChild(applyBtn);

    renderSearchableTable({
      content: modal.content,
      searchInput: modal.searchInput,
      columns: ['Ereignis', 'Technischer Name'],
      rows: COMMON_EVENTS,
      renderRow: (event) => [
        escapeHtml(event.label),
        `<span class="entity-id">${escapeHtml(event.id)}</span>`,
      ],
      matches: (event, term) =>
        [event.label, event.id].join(' ').toLowerCase().includes(term),
      onSelect: (event) => {
        this.setValue(event.id);
        modal.close();
      },
    });
    modal.content.appendChild(customWrap);
  }
}
