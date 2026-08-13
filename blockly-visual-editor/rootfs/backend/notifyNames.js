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

module.exports = {
  slugifyNotifyName,
  titleFromService,
  collapseDuplicatedName,
  findMatchingState,
  pickDeviceName,
};
