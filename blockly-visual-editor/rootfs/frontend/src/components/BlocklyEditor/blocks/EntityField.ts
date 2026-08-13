import * as Blockly from 'blockly';
import { getApiUrl } from '../../../api';

export interface HaEntity {
  entity_id: string;
  state: string;
  friendly_name: string;
  domain: string;
  device_class?: string | null;
  unit_of_measurement?: string | null;
}

let entityCache: { at: number; entities: HaEntity[] } | null = null;
const CACHE_MS = 30_000;

async function loadEntities(): Promise<HaEntity[]> {
  if (entityCache && Date.now() - entityCache.at < CACHE_MS) {
    return entityCache.entities;
  }
  const res = await fetch(getApiUrl('api/entities'));
  if (!res.ok) {
    throw new Error(`Entitäten konnten nicht geladen werden (HTTP ${res.status})`);
  }
  const entities = (await res.json()) as HaEntity[];
  entityCache = { at: Date.now(), entities };
  return entities;
}

export class EntityField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  private domainFilter?: string;

  static override fromJson(options: Record<string, unknown>): EntityField {
    const value = typeof options['value'] === 'string' ? options['value'] : '';
    const domain = typeof options['domain'] === 'string' ? options['domain'] : undefined;
    return new EntityField(value, undefined, domain);
  }

  constructor(
    value?: string,
    validator?: Blockly.FieldValidator<string>,
    domain?: string,
  ) {
    super(value ?? '', validator);
    this.domainFilter = domain;
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    this.showEntitySelector();
  }

  private showEntitySelector(): void {
    const overlay = document.createElement('div');
    overlay.className = 'entity-selector-overlay';
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'entity-selector-modal';

    const header = document.createElement('div');
    header.className = 'entity-selector-header';
    header.innerHTML = '<h3>Entität auswählen</h3>';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'entity-selector-close';
    closeBtn.setAttribute('aria-label', 'Schließen');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);

    const searchWrap = document.createElement('div');
    searchWrap.className = 'entity-selector-search';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Entität suchen…';
    searchWrap.appendChild(searchInput);

    const content = document.createElement('div');
    content.className = 'entity-selector-content';
    content.textContent = 'Lade Entitäten…';

    modal.appendChild(header);
    modal.appendChild(searchWrap);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    searchInput.focus();

    loadEntities()
      .then((entities) => {
        const filtered = this.domainFilter
          ? entities.filter((entity) => entity.domain === this.domainFilter)
          : entities;
        this.renderEntityTable(content, filtered, searchInput, overlay);
      })
      .catch((error: Error) => {
        content.innerHTML = `<div class="entity-selector-error">${error.message}</div>`;
      });
  }

  private renderEntityTable(
    content: HTMLElement,
    entities: HaEntity[],
    searchInput: HTMLInputElement,
    overlay: HTMLElement,
  ): void {
    content.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'entity-selector-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Entität</th>
          <th>Name</th>
          <th>Status</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');

    const renderRows = (list: HaEntity[]) => {
      tbody.replaceChildren();
      if (list.length === 0) {
        const empty = document.createElement('tr');
        empty.innerHTML = '<td colspan="3">Keine Entitäten gefunden.</td>';
        tbody.appendChild(empty);
        return;
      }
      for (const entity of list) {
        const row = document.createElement('tr');
        const unit = entity.unit_of_measurement ? ` ${entity.unit_of_measurement}` : '';
        row.innerHTML = `
          <td class="entity-id">${escapeHtml(entity.entity_id)}</td>
          <td>${escapeHtml(entity.friendly_name)}</td>
          <td>${escapeHtml(entity.state)}${escapeHtml(unit)}</td>
        `;
        row.addEventListener('click', () => {
          this.setValue(entity.entity_id);
          overlay.remove();
        });
        tbody.appendChild(row);
      }
    };

    renderRows(entities);
    table.appendChild(tbody);
    content.appendChild(table);

    searchInput.addEventListener('input', () => {
      const term = searchInput.value.toLowerCase().trim();
      const matches = !term
        ? entities
        : entities.filter((entity) =>
            [entity.entity_id, entity.friendly_name, entity.state, entity.domain]
              .join(' ')
              .toLowerCase()
              .includes(term),
          );
      renderRows(matches);
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

