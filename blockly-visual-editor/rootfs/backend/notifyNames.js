function slugifyNotifyName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function titleFromService(serviceName) {
  return serviceName
    .replace(/^mobile_app_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function collapseDuplicatedName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (!name) {
    return '';
  }
  const parts = name.split(' ');
  if (parts.length >= 2 && parts.length % 2 === 0) {
    const mid = parts.length / 2;
    const left = parts.slice(0, mid).join(' ');
    const right = parts.slice(mid).join(' ');
    if (left.toLowerCase() === right.toLowerCase()) {
      return left;
    }
  }
  return name;
}

function findMatchingState(states, prefixes, objectId) {
  const slug = slugifyNotifyName(objectId);
  const candidates = states.filter((item) => prefixes.some((prefix) => item.entity_id.startsWith(prefix)));
  return candidates.find((item) => slugifyNotifyName(item.entity_id.split('.').slice(1).join('.')) === slug)
    || candidates.find((item) => slugifyNotifyName(item.attributes?.friendly_name) === slug)
    || candidates.find((item) => slugifyNotifyName(item.entity_id).includes(slug))
    || null;
}

function pickDeviceName({ serviceName, serviceMetaName, tracker, notifyEntity }) {
  const candidates = [
    notifyEntity?.attributes?.friendly_name,
    tracker?.attributes?.friendly_name,
    serviceMetaName,
    titleFromService(serviceName),
  ]
    .map(collapseDuplicatedName)
    .filter(Boolean);

  return candidates[0] || titleFromService(serviceName);
}

function asList(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeTrackerId(id) {
  const raw = String(id || '').trim();
  if (!raw) {
    return '';
  }
  return raw.startsWith('device_tracker.') ? raw : `device_tracker.${raw}`;
}

const GENERIC_NAME_TOKENS = new Set([
  'mobile', 'app', 'phone', 'smartphone', 'tablet', 'tab', 'watch',
  'samsung', 'xiaomi', 'google', 'apple', 'huawei', 'oneplus', 'oppo', 'vivo',
  'iphone', 'ipad', 'pixel', 'galaxy', 'redmi',
  'pro', 'plus', 'ultra', 'lite', 'max', 'mini', 'note', 'fe',
]);

function tokensFromSlug(value) {
  return slugifyNotifyName(value).split('_').filter((token) => token.length > 1);
}

function slugsRelated(left, right) {
  const a = slugifyNotifyName(left);
  const b = slugifyNotifyName(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (shorter.length >= 10 && longer.includes(shorter)) {
    return true;
  }

  const leftTokens = tokensFromSlug(a).filter((token) => !GENERIC_NAME_TOKENS.has(token));
  const rightTokens = tokensFromSlug(b).filter((token) => !GENERIC_NAME_TOKENS.has(token));
  const overlap = leftTokens.filter((token) => rightTokens.includes(token));
  if (overlap.some((token) => /\d/.test(token) && token.length >= 3)) {
    return true;
  }
  if (overlap.length >= 2) {
    return true;
  }
  return false;
}

function personTrackerIds(person) {
  return asList(person?.attributes?.device_trackers)
    .concat(asList(person?.attributes?.source))
    .map(normalizeTrackerId)
    .filter(Boolean);
}

function findPersonForTarget({ persons, states, objectId, tracker, deviceName }) {
  const list = Array.isArray(persons) ? persons : [];
  const allStates = Array.isArray(states) ? states : [];
  const notifyKeys = [objectId, deviceName].filter(Boolean);

  const byTrackerId = tracker
    ? list.find((person) => personTrackerIds(person).includes(tracker.entity_id))
    : null;
  if (byTrackerId) {
    return byTrackerId;
  }

  const byIdentity = list.find((person) => personTrackerIds(person).some((id) => {
    const entity = allStates.find((item) => item.entity_id === id);
    const keys = [
      id.replace(/^device_tracker\./, ''),
      entity?.attributes?.friendly_name,
    ].filter(Boolean);
    return keys.some((key) => notifyKeys.some((notifyKey) => slugsRelated(key, notifyKey)));
  }));
  if (byIdentity) {
    return byIdentity;
  }

  const deviceSlug = slugifyNotifyName(deviceName);
  if (deviceSlug.length < 4) {
    return null;
  }
  return list.find((person) => {
    const personSlug = slugifyNotifyName(person?.attributes?.friendly_name || person?.entity_id);
    return personSlug.length >= 4 && (
      deviceSlug === personSlug
      || deviceSlug.startsWith(`${personSlug}_`)
      || tokensFromSlug(deviceSlug).includes(personSlug)
    );
  }) || null;
}

module.exports = {
  slugifyNotifyName,
  titleFromService,
  collapseDuplicatedName,
  findMatchingState,
  pickDeviceName,
  findPersonForTarget,
};
