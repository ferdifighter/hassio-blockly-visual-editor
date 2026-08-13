export interface SelectorModal {
  overlay: HTMLElement;
  content: HTMLElement;
  searchInput: HTMLInputElement | null;
  close: () => void;
}

export function openSelectorModal(options: {
  title: string;
  searchPlaceholder?: string;
  compact?: boolean;
  loadingText?: string;
}): SelectorModal {
  const overlay = document.createElement('div');
  overlay.className = 'entity-selector-overlay';

  const close = () => overlay.remove();
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  const modal = document.createElement('div');
  modal.className = options.compact
    ? 'entity-selector-modal entity-selector-modal-compact'
    : 'entity-selector-modal';

  const header = document.createElement('div');
  header.className = 'entity-selector-header';
  const title = document.createElement('h3');
  title.textContent = options.title;
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'entity-selector-close';
  closeBtn.setAttribute('aria-label', 'Schließen');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', close);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  let searchInput: HTMLInputElement | null = null;
  if (options.searchPlaceholder) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'entity-selector-search';
    searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = options.searchPlaceholder;
    searchWrap.appendChild(searchInput);
    modal.appendChild(searchWrap);
  }

  const content = document.createElement('div');
  content.className = 'entity-selector-content';
  if (options.loadingText) {
    content.textContent = options.loadingText;
  }
  modal.appendChild(content);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  searchInput?.focus();

  return { overlay, content, searchInput, close };
}

export function renderSearchableTable<T>(options: {
  content: HTMLElement;
  searchInput: HTMLInputElement | null;
  columns: string[];
  rows: T[];
  renderRow: (item: T) => string[];
  rowClass?: (item: T) => string;
  matches: (item: T, term: string) => boolean;
  onSelect: (item: T) => void;
  emptyText?: string;
}): void {
  const { content, searchInput, columns, rows, renderRow, matches, onSelect } = options;
  content.innerHTML = '';

  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'entity-selector-error';
    empty.textContent = options.emptyText || 'Keine Einträge gefunden.';
    content.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'entity-selector-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const column of columns) {
    const th = document.createElement('th');
    th.textContent = column;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  const draw = (list: T[]) => {
    tbody.replaceChildren();
    if (list.length === 0) {
      const empty = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = columns.length;
      td.textContent = options.emptyText || 'Keine Treffer.';
      empty.appendChild(td);
      tbody.appendChild(empty);
      return;
    }
    for (const item of list) {
      const tr = document.createElement('tr');
      const extraClass = options.rowClass?.(item);
      if (extraClass) {
        tr.className = extraClass;
      }
      const cells = renderRow(item);
      for (const html of cells) {
        const td = document.createElement('td');
        td.innerHTML = html;
        tr.appendChild(td);
      }
      tr.addEventListener('click', () => onSelect(item));
      tbody.appendChild(tr);
    }
  };

  draw(rows);
  table.appendChild(tbody);
  content.appendChild(table);

  searchInput?.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase().trim();
    draw(!term ? rows : rows.filter((item) => matches(item, term)));
  });
}
