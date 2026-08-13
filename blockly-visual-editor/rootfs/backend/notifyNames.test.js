const test = require('node:test');
const assert = require('node:assert/strict');
const {
  collapseDuplicatedName,
  pickDeviceName,
  titleFromService,
  findMatchingState,
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
