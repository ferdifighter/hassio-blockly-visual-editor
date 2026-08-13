import * as Blockly from 'blockly';
import { getApiUrl } from '../../../api';

export interface NotifyTarget {
  service: string;
  device_name: string;
  person_id?: string | null;
  person_name?: string | null;
  label: string;
}

let targetCache: { at: number; targets: NotifyTarget[] } | null = null;
const CACHE_MS = 30_000;

export async function loadNotifyTargets(): Promise<NotifyTarget[]> {
  if (targetCache && Date.now() - targetCache.at < CACHE_MS) {
    return targetCache.targets;
  }
  const res = await fetch(getApiUrl('api/notify-targets'));
  if (!res.ok) {
    throw new Error(`Companion-Geräte konnten nicht geladen werden (HTTP ${res.status})`);
  }
  const targets = (await res.json()) as NotifyTarget[];
  targetCache = { at: Date.now(), targets };
  return targets;
}

function labelForService(service: string): string {
  const cached = targetCache?.targets.find((target) => target.service === service);
  if (cached) {
    return cached.label;
  }
  return service.replace(/^notify\.mobile_app_/, '').replace(/_/g, ' ') || 'Smartphone wählen';
}

export class NotifyTargetField extends Blockly.FieldTextInput {
  static SERIALIZABLE = true;

  static override fromJson(options: Record<string, unknown>): NotifyTargetField {
    const value = typeof options['value'] === 'string' ? options['value'] : '';
    return new NotifyTargetField(value);
  }

  constructor(value?: string, validator?: Blockly.FieldValidator<string>) {
    super(value ?? '', validator);
  }

  override getText(): string {
    const value = this.getValue() || '';
    if (!value) {
      return 'Smartphone wählen';
    }
    return labelForService(value);
  }

  protected override showEditor_(_e?: Event, _quietInput?: boolean): void {
    this.showTargetSelector();
  }

  private showTargetSelector(): void {
    const overlay = document.createElement('div');
    overlay.className = 'entity-selector-overlay';
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) overlay.remove();
    });

    const modal = document.createElement('div');
    modal.className = 'entity-selector-modal';

    const header = document.createElement('div');
    header.className = 'entity-selector-header';
    header.innerHTML = '<h3>Smartphone / Person wählen</h3>';
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
    searchInput.placeholder = 'Person oder Smartphone suchen…';
    searchWrap.appendChild(searchInput);

    const content = document.createElement('div');
    content.className = 'entity-selector-content';
    content.textContent = 'Lade Companion-Geräte…';

    modal.appendChild(header);
    modal.appendChild(searchWrap);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    searchInput.focus();

    loadNotifyTargets()
      .then((targets) => {
        this.renderTable(content, targets, searchInput, overlay);
        this.forceRerender();
      })
      .catch((error: Error) => {
        content.innerHTML = `<div class="entity-selector-error">${error.message}</div>`;
      });
  }

  private renderTable(
    content: HTMLElement,
    targets: NotifyTarget[],
    searchInput: HTMLInputElement,
    overlay: HTMLElement,
  ): void {
    content.innerHTML = '';
    if (targets.length === 0) {
      content.innerHTML = `
        <div class="entity-selector-error">
          Keine Home Assistant Companion App gefunden.<br/>
          Installiere die App auf einem Smartphone und registriere sie in Home Assistant.
        </div>`;
      return;
    }

    const table = document.createElement('table');
    table.className = 'entity-selector-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Person</th>
          <th>Smartphone</th>
          <th>Dienst</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');

    const renderRows = (list: NotifyTarget[]) => {
      tbody.replaceChildren();
      if (list.length === 0) {
        const empty = document.createElement('tr');
        empty.innerHTML = '<td colspan="3">Keine Treffer.</td>';
        tbody.appendChild(empty);
        return;
      }
      for (const target of list) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${escapeHtml(target.person_name || '—')}</td>
          <td>${escapeHtml(target.device_name)}</td>
          <td class="entity-id">${escapeHtml(target.service)}</td>
        `;
        row.addEventListener('click', () => {
          this.setValue(target.service);
          overlay.remove();
        });
        tbody.appendChild(row);
      }
    };

    renderRows(targets);
    table.appendChild(tbody);
    content.appendChild(table);

    searchInput.addEventListener('input', () => {
      const term = searchInput.value.toLowerCase().trim();
      const matches = !term
        ? targets
        : targets.filter((target) =>
            [target.label, target.person_name, target.device_name, target.service]
              .filter(Boolean)
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
