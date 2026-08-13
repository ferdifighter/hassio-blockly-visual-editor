import * as Blockly from 'blockly';
import { getApiUrl } from '../../../api';
import { escapeHtml } from './fieldUtils';
import { openSelectorModal, renderSearchableTable } from './selectorModal';

export interface HaEntity {
  entity_id: string;
  state: string;
  friendly_name: string;
  domain: string;
  device_class?: string | null;
  unit_of_measurement?: string | null;
  options?: string[] | null;
}

let entityCache: { at: number; entities: HaEntity[] } | null = null;
const CACHE_MS = 30_000;

export async function loadEntities(): Promise<HaEntity[]> {
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

export function getCachedEntities(): HaEntity[] {
  return entityCache?.entities ?? [];
}

export function labelForEntity(entityId: string): string {
  if (!entityId) {
    return 'Entität wählen';
  }
  const cached = entityCache?.entities.find((entity) => entity.entity_id === entityId);
  if (cached?.friendly_name) {
    return cached.friendly_name;
  }
  return entityId;
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

  override getText(): string {
    const value = this.getValue() || '';
    if (!value) {
      return this.placeholderLabel();
    }
    return labelForEntity(value);
  }

  private placeholderLabel(): string {
    switch (this.domainFilter) {
      case 'light':
        return 'Licht wählen';
      case 'switch':
        return 'Schalter wählen';
      case 'scene':
        return 'Szene wählen';
      case 'calendar':
        return 'Kalender wählen';
      default:
        return 'Entität wählen';
    }
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    const modal = openSelectorModal({
      title: this.placeholderLabel(),
      searchPlaceholder: 'Name oder Bereich suchen…',
      loadingText: 'Lade Entitäten…',
    });

    loadEntities()
      .then((entities) => {
        const filtered = this.domainFilter
          ? entities.filter((entity) => entity.domain === this.domainFilter)
          : entities;
        filtered.sort((a, b) => a.friendly_name.localeCompare(b.friendly_name, 'de'));
        this.forceRerender();
        renderSearchableTable({
          content: modal.content,
          searchInput: modal.searchInput,
          columns: ['Name', 'Bereich', 'Status', 'ID'],
          rows: filtered,
          emptyText: 'Keine Entitäten gefunden.',
          renderRow: (entity) => [
            escapeHtml(entity.friendly_name),
            escapeHtml(entity.domain),
            escapeHtml(`${entity.state}${entity.unit_of_measurement ? ` ${entity.unit_of_measurement}` : ''}`),
            `<span class="entity-id">${escapeHtml(entity.entity_id)}</span>`,
          ],
          matches: (entity, term) =>
            [entity.friendly_name, entity.entity_id, entity.state, entity.domain]
              .join(' ')
              .toLowerCase()
              .includes(term),
          onSelect: (entity) => {
            this.setValue(entity.entity_id);
            modal.close();
          },
        });
      })
      .catch((error: Error) => {
        modal.content.innerHTML = `<div class="entity-selector-error">${escapeHtml(error.message)}</div>`;
      });
  }
}
