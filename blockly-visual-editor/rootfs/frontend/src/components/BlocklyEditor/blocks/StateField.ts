import * as Blockly from 'blockly';
import { DOMAIN_STATES, escapeHtml, labelForState } from './fieldUtils';
import { getCachedEntities, loadEntities, type HaEntity } from './EntityField';
import { openSelectorModal, renderSearchableTable } from './selectorModal';

function statesForEntity(entity: HaEntity | undefined, entityId: string): string[] {
  const states = new Set<string>();
  if (entity?.options) {
    entity.options.forEach((item) => states.add(item));
  }
  if (entity?.state && entity.state !== 'unavailable' && entity.state !== 'unknown') {
    states.add(entity.state);
  }
  const domain = entity?.domain || entityId.split('.')[0];
  (DOMAIN_STATES[domain] || []).forEach((item) => states.add(item));
  if (states.size === 0) {
    ['on', 'off'].forEach((item) => states.add(item));
  }
  return [...states];
}

export class StateField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  static override fromJson(options: Record<string, unknown>): StateField {
    const value = typeof options['value'] === 'string' ? options['value'] : '';
    return new StateField(value);
  }

  override getText(): string {
    return labelForState(this.getValue() || '');
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    const block = this.getSourceBlock();
    const entityId = String(block?.getFieldValue('ENTITY_ID') || '');
    const modal = openSelectorModal({
      title: 'Zustand wählen',
      searchPlaceholder: 'Zustand suchen…',
      compact: true,
      loadingText: 'Lade Zustände…',
    });

    const show = (entities: HaEntity[]) => {
      const entity = entities.find((item) => item.entity_id === entityId);
      const states = statesForEntity(entity, entityId);
      const rows = states.map((state) => ({
        state,
        label: labelForState(state),
        current: entity?.state === state,
      }));

      const customWrap = document.createElement('div');
      customWrap.className = 'field-picker-custom';
      const customInput = document.createElement('input');
      customInput.type = 'text';
      customInput.placeholder = 'Eigener Zustand…';
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
        columns: ['Zustand', 'Wert'],
        rows,
        emptyText: 'Keine Zustände gefunden.',
        renderRow: (row) => [
          `${escapeHtml(row.label)}${row.current ? ' <span class="field-picker-current">aktuell</span>' : ''}`,
          `<span class="entity-id">${escapeHtml(row.state)}</span>`,
        ],
        matches: (row, term) =>
          [row.label, row.state].join(' ').toLowerCase().includes(term),
        onSelect: (row) => {
          this.setValue(row.state);
          modal.close();
        },
      });
      modal.content.appendChild(customWrap);
    };

    const cached = getCachedEntities();
    if (cached.length) {
      show(cached);
      return;
    }

    loadEntities()
      .then(show)
      .catch((error: Error) => {
        modal.content.innerHTML = `<div class="entity-selector-error">${escapeHtml(error.message)}</div>`;
      });
  }
}
