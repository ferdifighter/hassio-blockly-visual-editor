const test = require('node:test');
const assert = require('node:assert/strict');
const {
  collapseDuplicatedName,
  pickDeviceName,
  titleFromService,
  findMatchingState,
  findPersonForTarget,
} = require('./notifyNames');

test('entfernt verdoppelte Notify-Dienstnamen', () => {
  assert.equal(
    collapseDuplicatedName('Xiaomi-17-Ultra Xiaomi-17-Ultra'),
    'Xiaomi-17-Ultra',
  );
  assert.equal(collapseDuplicatedName('Xiaomi 12T Pro'), 'Xiaomi 12T Pro');
  assert.equal(titleFromService('mobile_app_xiaomi_17_ultra'), 'Xiaomi 17 Ultra');
});

test('bevorzugt den Anzeigenamen der Notify-Entität', () => {
  const name = pickDeviceName({
    serviceName: 'mobile_app_xiaomi_17_ultra',
    serviceMetaName: 'Xiaomi-17-Ultra Xiaomi-17-Ultra',
    notifyEntity: { attributes: { friendly_name: 'Xiaomi 17 Ultra' } },
    tracker: null,
  });
  assert.equal(name, 'Xiaomi 17 Ultra');
});

test('fällt nicht auf den doppelten API-Namen zurück', () => {
  const name = pickDeviceName({
    serviceName: 'mobile_app_xiaomi_17_ultra',
    serviceMetaName: 'Xiaomi-17-Ultra Xiaomi-17-Ultra',
    notifyEntity: null,
    tracker: null,
  });
  assert.equal(name, 'Xiaomi-17-Ultra');
});

test('findet den passenden device_tracker', () => {
  const tracker = findMatchingState(
    [
      { entity_id: 'device_tracker.iphone', attributes: { friendly_name: 'iPhone' } },
      { entity_id: 'device_tracker.xiaomi_17_ultra', attributes: { friendly_name: 'Xiaomi 17 Ultra' } },
    ],
    ['device_tracker.'],
    'xiaomi_17_ultra',
  );
  assert.equal(tracker.attributes.friendly_name, 'Xiaomi 17 Ultra');
});

test('ordnet die Person über den zugewiesenen Tracker zu', () => {
  const persons = [
    {
      entity_id: 'person.ferdi',
      attributes: {
        friendly_name: 'Ferdi',
        device_trackers: ['device_tracker.gs285'],
      },
    },
  ];
  const states = [
    { entity_id: 'device_tracker.gs285', attributes: { friendly_name: 'Xiaomi 17 Ultra' } },
  ];
  const person = findPersonForTarget({
    persons,
    states,
    objectId: 'xiaomi_17_ultra',
    tracker: null,
    deviceName: 'Xiaomi 17 Ultra',
  });
  assert.equal(person.entity_id, 'person.ferdi');
});

test('ordnet die Person über den Tracker in der Person-Entität zu', () => {
  const tracker = { entity_id: 'device_tracker.xiaomi_12t_pro', attributes: { friendly_name: 'Xiaomi 12T Pro' } };
  const person = findPersonForTarget({
    persons: [{
      entity_id: 'person.anna',
      attributes: { friendly_name: 'Anna', device_trackers: ['device_tracker.xiaomi_12t_pro'] },
    }],
    states: [tracker],
    objectId: 'xiaomi_12t_pro',
    tracker,
    deviceName: 'Xiaomi 12T Pro',
  });
  assert.equal(person.attributes.friendly_name, 'Anna');
});

test('verwechselt nicht zwei Xiaomi-Geräte', () => {
  const persons = [
    {
      entity_id: 'person.ferdi',
      attributes: {
        friendly_name: 'Ferdi',
        device_trackers: ['device_tracker.gs285'],
      },
    },
  ];
  const states = [
    { entity_id: 'device_tracker.gs285', attributes: { friendly_name: 'Xiaomi 17 Ultra' } },
  ];
  const person = findPersonForTarget({
    persons,
    states,
    objectId: 'xiaomi_12t_pro',
    tracker: null,
    deviceName: 'Xiaomi 12T Pro',
  });
  assert.equal(person, null);
});

test('erkennt den Gerätenamen im Personennamen', () => {
  const person = findPersonForTarget({
    persons: [{ entity_id: 'person.ferdi', attributes: { friendly_name: 'Ferdi', device_trackers: [] } }],
    states: [],
    objectId: 'ferdi_iphone',
    tracker: null,
    deviceName: 'Ferdi iPhone',
  });
  assert.equal(person.entity_id, 'person.ferdi');
});

test('ordnet ein Tablet über die Modellnummer zu', () => {
  const person = findPersonForTarget({
    persons: [{
      entity_id: 'person.ferdi',
      attributes: { friendly_name: 'Ferdi', device_trackers: 'device_tracker.sm_t505' },
    }],
    states: [{ entity_id: 'device_tracker.sm_t505', attributes: { friendly_name: 'SM-T505' } }],
    objectId: 'samsung_tab_sm_t505',
    tracker: null,
    deviceName: 'Samsung Tab SM-T505',
  });
  assert.equal(person.entity_id, 'person.ferdi');
});
