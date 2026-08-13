import * as Blockly from 'blockly';
import { getApiUrl } from '../../../api';
import { DOMAIN_LABELS, escapeHtml } from './fieldUtils';
import { openSelectorModal, renderSearchableTable } from './selectorModal';

export interface HaService {
  service: string;
  domain: string;
  name: string;
  description?: string;
}

let serviceCache: { at: number; services: HaService[] } | null = null;
const CACHE_MS = 30_000;

export async function loadServices(): Promise<HaService[]> {
  if (serviceCache && Date.now() - serviceCache.at < CACHE_MS) {
    return serviceCache.services;
  }
  const res = await fetch(getApiUrl('api/services'));
  if (!res.ok) {
    throw new Error(`Services konnten nicht geladen werden (HTTP ${res.status})`);
  }
  const services = (await res.json()) as HaService[];
  serviceCache = { at: Date.now(), services };
  return services;
}

export function labelForService(service: string): string {
  if (!service) {
    return 'Service wählen';
  }
  const cached = serviceCache?.services.find((item) => item.service === service);
  if (cached) {
    const domain = DOMAIN_LABELS[cached.domain] || cached.domain;
    return `${domain} · ${cached.name}`;
  }
  const [domain, action = service] = service.split('.');
  const domainLabel = DOMAIN_LABELS[domain] || domain;
  const actionLabel = action.replace(/_/g, ' ');
  return domain ? `${domainLabel} · ${actionLabel}` : service;
}

export class ServiceField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  static override fromJson(options: Record<string, unknown>): ServiceField {
    const value = typeof options['value'] === 'string' ? options['value'] : '';
    return new ServiceField(value);
  }

  override getText(): string {
    return labelForService(this.getValue() || '');
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    const modal = openSelectorModal({
      title: 'Service wählen',
      searchPlaceholder: 'Service oder Bereich suchen…',
      loadingText: 'Lade Services…',
    });

    loadServices()
      .then((services) => {
        const sorted = [...services].sort((a, b) => a.service.localeCompare(b.service, 'de'));
        this.forceRerender();
        renderSearchableTable({
          content: modal.content,
          searchInput: modal.searchInput,
          columns: ['Bereich', 'Service', 'Technischer Name'],
          rows: sorted,
          emptyText: 'Keine Services gefunden.',
          renderRow: (item) => [
            escapeHtml(DOMAIN_LABELS[item.domain] || item.domain),
            escapeHtml(item.name),
            `<span class="entity-id">${escapeHtml(item.service)}</span>`,
          ],
          matches: (item, term) =>
            [item.service, item.name, item.domain, DOMAIN_LABELS[item.domain], item.description]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(term),
          onSelect: (item) => {
            this.setValue(item.service);
            modal.close();
          },
        });
      })
      .catch((error: Error) => {
        modal.content.innerHTML = `<div class="entity-selector-error">${escapeHtml(error.message)}</div>`;
      });
  }
}
