const test = require('node:test');
const assert = require('node:assert/strict');
const {
  collectEntityIds,
  isMutatingService,
  isQueryService,
  simulateAutomation,
} = require('./simulate');

function states(list) {
  const map = {};
  for (const item of list) {
    map[item.entity_id] = item;
  }
  return map;
}

test('sammelt Entitäten aus Triggern, Bedingungen und Aktionen', () => {
  const ids = collectEntityIds({
    triggers: [{ trigger: 'state', entity_id: 'binary_sensor.tuer' }],
    conditions: [{ condition: 'numeric_state', entity_id: 'sensor.temp' }],
    actions: [{
      action: 'light.turn_on',
      target: { entity_id: ['light.kueche', 'light.flur'] },
    }],
  });
  assert.deepEqual([...ids].sort(), [
    'binary_sensor.tuer',
    'light.flur',
    'light.kueche',
    'sensor.temp',
  ]);
});

test('erkennt schaltende und abfragende Dienste', () => {
  assert.equal(isMutatingService('light.turn_on'), true);
  assert.equal(isMutatingService('notify.mobile_app_iphone'), true);
  assert.equal(isQueryService('bierfinder.search', {}), true);
  assert.equal(isQueryService('weather.get_forecast', { supports_response: 'only' }), true);
  assert.equal(isQueryService('light.turn_on', {}), false);
});

test('meldet fehlende Entitäten und erfüllt Zustandsbedingungen', async () => {
  const result = await simulateAutomation({
    alias: 'Test',
    triggers: [{ trigger: 'state', entity_id: 'binary_sensor.tuer', to: 'on' }],
    conditions: [{ condition: 'state', entity_id: 'binary_sensor.tuer', state: 'on' }],
    actions: [{ action: 'light.turn_on', target: { entity_id: 'light.fehlt' } }],
  }, {
    now: new Date('2026-08-18T10:15:00'),
    states: states([
      { entity_id: 'binary_sensor.tuer', state: 'on', attributes: { friendly_name: 'Tür' } },
    ]),
    services: { 'light.turn_on': {} },
  });

  assert.equal(result.summary.conditionsMet, true);
  assert.equal(result.summary.missingEntities, 1);
  assert.equal(result.summary.ok, false);
  assert.ok(result.entries.some((item) => item.message.includes('Keine Verbindung zu light.fehlt')));
  assert.ok(result.entries.some((item) => item.message.includes('würde ausgeführt')));
});

test('Zahlenbedingung und Zeitbedingung werden gegen den aktuellen Stand geprüft', async () => {
  const result = await simulateAutomation({
    alias: 'Klima',
    triggers: [{ trigger: 'time', at: '07:00' }],
    conditions: [
      { condition: 'numeric_state', entity_id: 'sensor.temp', above: 20 },
      { condition: 'time', after: '08:00', before: '18:00', weekday: ['tue'] },
    ],
    actions: [{ action: 'switch.turn_on', target: { entity_id: 'switch.luefter' } }],
  }, {
    now: new Date('2026-08-18T10:15:00'),
    states: states([
      { entity_id: 'sensor.temp', state: '22.5', attributes: { friendly_name: 'Temperatur', unit_of_measurement: '°C' } },
      { entity_id: 'switch.luefter', state: 'off', attributes: { friendly_name: 'Lüfter' } },
    ]),
  });

  assert.equal(result.summary.conditionsMet, true);
  assert.equal(result.summary.wouldRun, true);
  assert.ok(result.entries.some((item) => item.message.includes('würde jetzt nicht auslösen')));
});

test('führt Abfragen aus und schaltet nicht wirklich', async () => {
  const calls = [];
  const result = await simulateAutomation({
    alias: 'Bier',
    triggers: [{ trigger: 'time', at: '10:15' }],
    conditions: [],
    actions: [
      { action: 'bierfinder.search', data: { query: 'Pils' } },
      { action: 'notify.notify', data: { message: 'Gefunden' } },
    ],
  }, {
    now: new Date('2026-08-18T10:15:00'),
    states: states([
      { entity_id: 'sensor.bierfinder_ergebnis', state: 'Pilsner', attributes: { friendly_name: 'Bierfinder' } },
    ]),
    services: {
      'bierfinder.search': { supports_response: 'optional' },
      'notify.notify': {},
    },
    callQueryService: async (call) => {
      calls.push(call);
      return { beers: [{ name: 'Pilsner', brewery: 'Testbräu' }] };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].action, 'bierfinder.search');
  assert.equal(result.summary.queries, 1);
  assert.ok(result.entries.some((item) => item.level === 'result' && String(item.message).includes('bierfinder.search')));
  assert.ok(result.entries.some((item) => item.message.includes('notify.notify') && item.message.includes('nicht wirklich')));
});

test('zeigt Integrationswerte, wenn eine Abfrage fehlschlägt', async () => {
  const result = await simulateAutomation({
    alias: 'Bier',
    triggers: [{ trigger: 'time', at: '12:00' }],
    conditions: [],
    actions: [{ action: 'bierfinder.search', data: { query: 'Pils' } }],
  }, {
    now: new Date('2026-08-18T12:00:00'),
    states: states([
      { entity_id: 'sensor.bierfinder_ergebnis', state: 'Pilsner Urquell', attributes: { friendly_name: 'Bierfinder Ergebnis' } },
    ]),
    services: { 'bierfinder.search': { supports_response: 'optional' } },
    callQueryService: async () => {
      throw new Error('return_response nicht unterstützt');
    },
  });

  assert.ok(result.entries.some((item) => item.level === 'error' && item.message.includes('bierfinder.search')));
  assert.ok(result.entries.some((item) => item.level === 'result' && item.message.includes('sensor.bierfinder_ergebnis')));
});

test('Wenn-Zweig folgt der aktuellen Bedingung', async () => {
  const result = await simulateAutomation({
    alias: 'If',
    triggers: [{ trigger: 'homeassistant', event: 'start' }],
    conditions: [],
    actions: [{
      if: [{ condition: 'state', entity_id: 'sun.sun', state: 'above_horizon' }],
      then: [{ action: 'light.turn_on', target: { entity_id: 'light.garten' } }],
      else: [{ action: 'light.turn_off', target: { entity_id: 'light.garten' } }],
    }],
  }, {
    now: new Date('2026-08-18T12:00:00'),
    states: states([
      { entity_id: 'sun.sun', state: 'below_horizon', attributes: {} },
      { entity_id: 'light.garten', state: 'on', attributes: { friendly_name: 'Garten' } },
    ]),
  });

  assert.ok(result.entries.some((item) => item.message.includes('Sonst wird geprüft')));
  assert.ok(result.entries.some((item) => item.message.includes('light.turn_off')));
  assert.ok(!result.entries.some((item) => item.message.includes('light.turn_on') && item.message.includes('würde ausgeführt')));
});
