import * as Blockly from 'blockly';

// Benutzerdefiniertes Field für Entity-Auswahl
class EntityField extends Blockly.FieldTextInput {
  constructor(value?: string, validator?: Blockly.FieldValidator<string>) {
    super(value, validator);
    this.SERIALIZABLE = true;
  }

  // Click-Handler überschreiben
  onMouseDown_(e: Event) {
    e.stopPropagation();
    this.showEntitySelector_();
  }

  // Entity-Selector anzeigen
  showEntitySelector_() {
    // Einfaches Popup mit Entitäten-Liste
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #222;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
      width: 90vw;
      max-width: 800px;
      height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #333;
      background: #2a2a2a;
    `;
    header.innerHTML = `
      <h3 style="margin: 0; color: #fff; font-size: 18px;">Entität auswählen</h3>
      <button style="background: none; border: none; color: #aaa; font-size: 24px; cursor: pointer;" onclick="this.closest('.entity-selector-overlay').remove()">×</button>
    `;

    const searchDiv = document.createElement('div');
    searchDiv.style.cssText = `
      padding: 16px 24px;
      border-bottom: 1px solid #333;
      background: #2a2a2a;
    `;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Entität suchen...';
    searchInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: #333;
      border: 1px solid #555;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
      outline: none;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 16px;
    `;

    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    `;

    // Header der Tabelle
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="background: #2a2a2a;">
        <th style="padding: 12px 16px; text-align: left; color: #fff; border-bottom: 1px solid #333;">Entität</th>
        <th style="padding: 12px 16px; text-align: left; color: #fff; border-bottom: 1px solid #333;">Name</th>
        <th style="padding: 12px 16px; text-align: left; color: #fff; border-bottom: 1px solid #333;">Status</th>
      </tr>
    `;

    const tbody = document.createElement('tbody');

    // Entitäten laden
    const getApiUrl = (endpoint: string) => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `http://localhost:8099/${endpoint.replace(/^\//, '')}`;
      }
      const base = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
      return `${window.location.protocol}//${window.location.host}${base}${endpoint.replace(/^\//, '')}`;
    };

    fetch(getApiUrl('api/entities'))
      .then(res => res.json())
      .then(entities => {
        entities.forEach((entity: any) => {
          const row = document.createElement('tr');
          row.style.cssText = `
            cursor: pointer;
            transition: background-color 0.2s;
            border-bottom: 1px solid #333;
          `;
          row.onmouseover = () => row.style.background = '#2a4155';
          row.onmouseout = () => row.style.background = '';
          row.onclick = () => {
            this.setValue(entity.entity_id);
            container.remove();
          };

          row.innerHTML = `
            <td style="padding: 12px 16px; color: #4ecdc4; font-family: monospace;">${entity.entity_id}</td>
            <td style="padding: 12px 16px; color: #ccc;">${entity.friendly_name}</td>
            <td style="padding: 12px 16px; color: #ccc;">${entity.state}${entity.unit_of_measurement ? ' ' + entity.unit_of_measurement : ''}</td>
          `;

          tbody.appendChild(row);
        });

        // Suchfunktion
        searchInput.oninput = () => {
          const searchTerm = searchInput.value.toLowerCase();
          Array.from(tbody.children).forEach((row: any) => {
            const entityId = row.children[0].textContent.toLowerCase();
            const friendlyName = row.children[1].textContent.toLowerCase();
            const state = row.children[2].textContent.toLowerCase();
            
            if (entityId.includes(searchTerm) || friendlyName.includes(searchTerm) || state.includes(searchTerm)) {
              row.style.display = '';
            } else {
              row.style.display = 'none';
            }
          });
        };
      })
      .catch(err => {
        content.innerHTML = `<div style="color: #e74c3c; text-align: center; padding: 20px;">Fehler beim Laden der Entitäten: ${err.message}</div>`;
      });

    table.appendChild(thead);
    table.appendChild(tbody);
    content.appendChild(table);

    searchDiv.appendChild(searchInput);
    modal.appendChild(header);
    modal.appendChild(searchDiv);
    modal.appendChild(content);
    container.appendChild(modal);
    container.className = 'entity-selector-overlay';
    document.body.appendChild(container);
  }
}

// Registriere das Field bei Blockly
Blockly.fieldRegistry.register('field_entity', EntityField);

export { EntityField }; 