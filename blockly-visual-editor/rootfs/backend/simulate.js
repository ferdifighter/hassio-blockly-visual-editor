'use strict';

const WEEKDAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_LABELS = {
  mon: 'Montag',
  tue: 'Dienstag',
  wed: 'Mittwoch',
  thu: 'Donnerstag',
  fri: 'Freitag',
  sat: 'Samstag',
  sun: 'Sonntag',
};

const MUTATING_ACTIONS = new Set([
  'turn_on',
  'turn_off',
  'toggle',
  'lock',
  'unlock',
  'open_cover',
  'close_cover',
  'stop_cover',
  'press',
  'reload',
  'restart',
  'play_media',
  'media_play',
  'media_pause',
  'media_stop',
  'volume_set',
  'volume_up',
  'volume_down',
  'set_value',
  'set_temperature',
  'set_hvac_mode',
  'set_preset_mode',
  'select_option',
  'select_source',
  'notify',
  'send_message',
  'create',
  'delete',
  'remove',
  'update',
]);

const QUERY_ACTION_RE = /^(get_|fetch_|list_|search|find_|query|lookup|check_|read_|forecast)/;

function entry(level, category, message, detail) {
  const item = {
    level,
    category,
    message,
    time: new Date().toISOString(),
  };
  if (detail !== undefined) {
    item.detail = detail;
  }
  return item;
}

function asArray(value) {
  if (value === undefined || value === null || value === '') {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function addEntityId(value, out) {
  for (const item of asArray(value)) {
    if (typeof item === 'string' && item.includes('.')) {
      out.add(item.trim());
    }
  }
}

function collectEntityIds(value, out = new Set()) {
  if (!value) {
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectEntityIds(item, out));
    return out;
  }
  if (typeof value !== 'object') {
    return out;
  }
  addEntityId(value.entity_id, out);
  if (value.target && typeof value.target === 'object') {
    addEntityId(value.target.entity_id, out);
  }
  for (const key of ['triggers', 'conditions', 'actions', 'sequence', 'then', 'else', 'if', 'wait_for_trigger']) {
    if (value[key]) {
      collectEntityIds(value[key], out);
    }
  }
  if (value.repeat) {
    collectEntityIds(value.repeat, out);
  }
  return out;
}

function actionName(service) {
  const raw = String(service || '');
  const dot = raw.lastIndexOf('.');
  return dot >= 0 ? raw.slice(dot + 1) : raw;
}

function isMutatingService(service) {
  const name = String(service || '').toLowerCase();
  if (name.startsWith('notify.') || name === 'notify') {
    return true;
  }
  const action = actionName(name);
  if (MUTATING_ACTIONS.has(action)) {
    return true;
  }
  return /^(turn_|set_|volume_|media_|open_|close_|lock|unlock)/.test(action);
}

function serviceSupportsResponse(meta) {
  if (!meta || typeof meta !== 'object') {
    return false;
  }
  const flag = meta.supports_response;
  if (flag === true || flag === 'optional' || flag === 'only') {
    return true;
  }
  return Boolean(meta.response);
}

function isQueryService(service, meta) {
  if (serviceSupportsResponse(meta)) {
    return true;
  }
  if (isMutatingService(service)) {
    return false;
  }
  return QUERY_ACTION_RE.test(actionName(service));
}

function getEntity(states, entityId) {
  if (!entityId) {
    return null;
  }
  return states[entityId] || null;
}

function entityLabel(entity, entityId) {
  return entity?.attributes?.friendly_name || entityId;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function weekdayId(date) {
  return WEEKDAY_IDS[date.getDay()];
}

function isUnavailable(entity) {
  const state = String(entity?.state || '').toLowerCase();
  return state === 'unavailable' || state === 'unknown';
}

function templateIsTrue(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text || text === 'false' || text === 'off' || text === '0' || text === 'none' || text === 'null') {
    return false;
  }
  return text === 'true' || text === 'on' || text === 'yes' || text === '1';
}

function describeTrigger(trigger, ctx) {
  const type = trigger.trigger || trigger.platform || 'unbekannt';
  const entityId = asArray(trigger.entity_id)[0];
  const entity = entityId ? getEntity(ctx.states, entityId) : null;

  if (type === 'time') {
    const at = trigger.at || '00:00';
    const now = formatTime(ctx.now);
    const firesNow = now === String(at).slice(0, 5);
    return {
      message: `Zeit-Trigger um ${at} (jetzt ${now})${firesNow ? ' — würde jetzt auslösen' : ' — würde jetzt nicht auslösen'}`,
      level: 'info',
    };
  }
  if (type === 'state') {
    if (!entityId) {
      return { message: 'Zustands-Trigger ohne Entität', level: 'warn' };
    }
    if (!entity) {
      return { message: `Zustands-Trigger: ${entityId} ist nicht erreichbar`, level: 'error' };
    }
    const current = entity.state;
    const to = trigger.to ? `, erwartet Wechsel nach „${trigger.to}“` : '';
    const from = trigger.from ? `, von „${trigger.from}“` : '';
    return {
      message: `Zustands-Trigger ${entityLabel(entity, entityId)}: aktuell „${current}“${from}${to}`,
      level: isUnavailable(entity) ? 'warn' : 'info',
    };
  }
  if (type === 'numeric_state') {
    if (!entityId) {
      return { message: 'Zahlen-Trigger ohne Entität', level: 'warn' };
    }
    if (!entity) {
      return { message: `Zahlen-Trigger: ${entityId} ist nicht erreichbar`, level: 'error' };
    }
    const extra = [trigger.above != null ? `über ${trigger.above}` : null, trigger.below != null ? `unter ${trigger.below}` : null]
      .filter(Boolean)
      .join(' und ');
    return {
      message: `Zahlen-Trigger ${entityLabel(entity, entityId)}: aktuell ${entity.state}${extra ? ` (${extra})` : ''}`,
      level: 'info',
    };
  }
  if (type === 'sun') {
    return { message: `Sonnen-Trigger: ${trigger.event || 'sunrise'}`, level: 'info' };
  }
  if (type === 'event') {
    return { message: `Ereignis-Trigger: ${trigger.event_type || 'event'}`, level: 'info' };
  }
  if (type === 'webhook') {
    return { message: `Webhook-Trigger: ${trigger.webhook_id || 'ohne ID'}`, level: 'info' };
  }
  if (type === 'calendar') {
    return {
      message: `Kalender-Trigger: ${entityId || 'ohne Kalender'} (${trigger.event || 'start'})`,
      level: entityId && !entity ? 'error' : 'info',
    };
  }
  if (type === 'template') {
    return { message: 'Vorlagen-Trigger (wird gegen den aktuellen Zeitpunkt geprüft)', level: 'info', detail: trigger.value_template };
  }
  if (type === 'homeassistant') {
    return { message: `Home-Assistant-Trigger: ${trigger.event || 'start'}`, level: 'info' };
  }
  return { message: `Trigger: ${type}`, level: 'info' };
}

async function evaluateCondition(condition, ctx, entries, prefix = '') {
  const type = condition.condition;
  const label = prefix ? `${prefix}` : 'Bedingung';

  if (type === 'and' || type === 'or' || type === 'not') {
    const inner = asArray(condition.conditions);
    const results = [];
    for (const item of inner) {
      results.push(await evaluateCondition(item, ctx, entries, type.toUpperCase()));
    }
    let ok = true;
    if (type === 'and') {
      ok = results.every(Boolean);
    } else if (type === 'or') {
      ok = results.some(Boolean);
    } else {
      ok = !results.some(Boolean);
    }
    entries.push(entry(ok ? 'ok' : 'warn', 'condition', `${label} ${type.toUpperCase()}: ${ok ? 'erfüllt' : 'nicht erfüllt'}`));
    return ok;
  }

  if (type === 'state') {
    const entityId = asArray(condition.entity_id)[0];
    const expected = asArray(condition.state).map(String);
    const entity = getEntity(ctx.states, entityId);
    if (!entityId) {
      entries.push(entry('warn', 'condition', `${label}: Zustandsprüfung ohne Entität`));
      return false;
    }
    if (!entity) {
      entries.push(entry('error', 'entity', `${label}: keine Verbindung zu ${entityId}`));
      return false;
    }
    const current = String(entity.state);
    const ok = expected.length === 0 || expected.includes(current);
    const forHint = condition.for ? ' (Dauer „for“ wird in der Simulation nicht geprüft)' : '';
    entries.push(entry(
      ok ? 'ok' : 'warn',
      'condition',
      `${label}: ${entityLabel(entity, entityId)} ist „${current}“${expected.length ? `, erwartet „${expected.join(' / ')}“` : ''}${ok ? '' : ' — nicht erfüllt'}${forHint}`,
    ));
    return ok;
  }

  if (type === 'numeric_state') {
    const entityId = asArray(condition.entity_id)[0];
    const entity = getEntity(ctx.states, entityId);
    if (!entityId) {
      entries.push(entry('warn', 'condition', `${label}: Zahlenprüfung ohne Entität`));
      return false;
    }
    if (!entity) {
      entries.push(entry('error', 'entity', `${label}: keine Verbindung zu ${entityId}`));
      return false;
    }
    const value = Number(entity.state);
    if (!Number.isFinite(value)) {
      entries.push(entry('warn', 'condition', `${label}: ${entityLabel(entity, entityId)} hat keinen Zahlenwert („${entity.state}“)`));
      return false;
    }
    let ok = true;
    const parts = [`aktuell ${value}`];
    if (condition.above != null && condition.above !== '') {
      const above = Number(condition.above);
      parts.push(`über ${above}`);
      if (!(value > above)) {
        ok = false;
      }
    }
    if (condition.below != null && condition.below !== '') {
      const below = Number(condition.below);
      parts.push(`unter ${below}`);
      if (!(value < below)) {
        ok = false;
      }
    }
    entries.push(entry(ok ? 'ok' : 'warn', 'condition', `${label}: ${entityLabel(entity, entityId)} ${parts.join(', ')}${ok ? '' : ' — nicht erfüllt'}`));
    return ok;
  }

  if (type === 'time') {
    const nowMinutes = ctx.now.getHours() * 60 + ctx.now.getMinutes();
    const after = parseMinutes(condition.after);
    const before = parseMinutes(condition.before);
    const days = asArray(condition.weekday).map((day) => String(day).toLowerCase());
    let ok = true;
    const bits = [`jetzt ${formatTime(ctx.now)}`];
    if (after != null && before != null && after > before) {
      ok = nowMinutes >= after || nowMinutes < before;
      bits.push(`zwischen ${condition.after} und ${condition.before} (über Mitternacht)`);
    } else {
      if (after != null) {
        bits.push(`nach ${condition.after}`);
        if (nowMinutes < after) {
          ok = false;
        }
      }
      if (before != null) {
        bits.push(`vor ${condition.before}`);
        if (nowMinutes >= before) {
          ok = false;
        }
      }
    }
    if (days.length) {
      const today = weekdayId(ctx.now);
      bits.push(`Wochentag ${WEEKDAY_LABELS[today] || today}`);
      if (!days.includes(today)) {
        ok = false;
      }
    }
    entries.push(entry(ok ? 'ok' : 'warn', 'condition', `${label}: Zeit ${bits.join(', ')}${ok ? '' : ' — nicht erfüllt'}`));
    return ok;
  }

  if (type === 'template') {
    const template = condition.value_template || condition.template || '';
    if (!ctx.renderTemplate) {
      entries.push(entry('warn', 'condition', `${label}: Vorlage kann ohne Home Assistant nicht geprüft werden`, template));
      return false;
    }
    try {
      const rendered = await ctx.renderTemplate(template);
      const ok = templateIsTrue(rendered);
      entries.push(entry(ok ? 'ok' : 'warn', 'condition', `${label}: Vorlage ergibt „${rendered}“${ok ? '' : ' — nicht erfüllt'}`, template));
      return ok;
    } catch (error) {
      entries.push(entry('error', 'condition', `${label}: Vorlage fehlgeschlagen (${error.message || error})`, template));
      return false;
    }
  }

  entries.push(entry('info', 'condition', `${label}: ${type || 'unbekannt'} wird in der Simulation nicht ausgewertet`));
  return true;
}

function relatedEntities(states, service) {
  const domain = String(service || '').split('.')[0];
  if (!domain || domain === 'homeassistant' || domain === 'notify') {
    return [];
  }
  return Object.keys(states)
    .filter((id) => id.startsWith(`${domain}.`) || id.includes(`.${domain}_`) || id.includes(`_${domain}`))
    .slice(0, 12);
}

function extractServiceCall(action) {
  const service = action.action || action.service;
  if (!service || typeof service !== 'string') {
    return null;
  }
  return {
    action: service,
    target: action.target && typeof action.target === 'object' ? action.target : undefined,
    data: action.data && typeof action.data === 'object' ? action.data : undefined,
  };
}

async function simulateActions(actions, ctx, entries, conditionsMet) {
  let planned = 0;
  let queries = 0;

  for (const action of asArray(actions)) {
    if (!action || typeof action !== 'object') {
      continue;
    }

    if (action.delay !== undefined) {
      const delay = typeof action.delay === 'object' ? JSON.stringify(action.delay) : String(action.delay);
      entries.push(entry('info', 'action', `Warten ${delay} — würde ausgeführt, nicht simuliert`));
      if (conditionsMet) {
        planned += 1;
      }
      continue;
    }

    if (action.stop !== undefined) {
      entries.push(entry('info', 'action', `Stopp: ${action.stop}`));
      continue;
    }

    if (action.variables) {
      entries.push(entry('info', 'action', 'Variable setzen', action.variables));
      continue;
    }

    if (action.wait_template || action.wait_for_trigger) {
      entries.push(entry('info', 'action', 'Warten auf Zustand/Vorlage — in der Simulation übersprungen'));
      continue;
    }

    if (action.repeat) {
      entries.push(entry('info', 'action', 'Wiederholung: Sequenz wird einmal probeweise durchlaufen'));
      const nested = await simulateActions(action.repeat.sequence, ctx, entries, conditionsMet);
      planned += nested.planned;
      queries += nested.queries;
      continue;
    }

    if (action.if) {
      let branchOk = true;
      for (const condition of asArray(action.if)) {
        const result = await evaluateCondition(condition, ctx, entries, 'Wenn');
        if (!result) {
          branchOk = false;
        }
      }
      if (branchOk) {
        entries.push(entry('ok', 'action', 'Wenn-Zweig: Dann würde ausgeführt'));
        const nested = await simulateActions(action.then, ctx, entries, conditionsMet);
        planned += nested.planned;
        queries += nested.queries;
      } else {
        entries.push(entry('warn', 'action', 'Wenn-Zweig: Dann würde nicht ausgeführt, Sonst wird geprüft'));
        const nested = await simulateActions(action.else, ctx, entries, conditionsMet);
        planned += nested.planned;
        queries += nested.queries;
      }
      continue;
    }

    const call = extractServiceCall(action);
    if (!call) {
      entries.push(entry('info', 'action', 'Unbekannte Aktion', action));
      continue;
    }

    const entityIds = asArray(call.target?.entity_id);
    let missing = false;
    for (const entityId of entityIds) {
      const entity = getEntity(ctx.states, entityId);
      if (!entity) {
        missing = true;
        entries.push(entry('error', 'entity', `Keine Verbindung zu ${entityId}`));
        continue;
      }
      const unit = entity.attributes?.unit_of_measurement ? ` ${entity.attributes.unit_of_measurement}` : '';
      const level = isUnavailable(entity) ? 'warn' : 'ok';
      entries.push(entry(
        level,
        'entity',
        `${entityLabel(entity, entityId)} (${entityId}) = ${entity.state}${unit}`,
        {
          last_changed: entity.last_changed,
          attributes: entity.attributes || {},
        },
      ));
    }

    const meta = ctx.services?.[call.action];
    if (ctx.services && Object.keys(ctx.services).length && !meta) {
      entries.push(entry('warn', 'action', `Dienst ${call.action} ist in Home Assistant nicht registriert`));
    }

    const query = isQueryService(call.action, meta);
    if (query && ctx.callQueryService && conditionsMet && !missing) {
      try {
        const result = await ctx.callQueryService(call);
        queries += 1;
        planned += 1;
        entries.push(entry('result', 'query', `Abfrage ${call.action}: Ergebnis empfangen`, result));
      } catch (error) {
        entries.push(entry('error', 'query', `Abfrage ${call.action} fehlgeschlagen: ${error.message || error}`));
        const related = relatedEntities(ctx.states, call.action).filter((id) => !entityIds.includes(id));
        for (const entityId of related.slice(0, 8)) {
          const entity = getEntity(ctx.states, entityId);
          if (!entity) {
            continue;
          }
          entries.push(entry(
            'result',
            'query',
            `Aktueller Wert ${entityLabel(entity, entityId)} (${entityId}) = ${entity.state}`,
            entity.attributes || {},
          ));
        }
      }
      continue;
    }

    if (!conditionsMet) {
      entries.push(entry('info', 'action', `${call.action} würde nicht ausgeführt, weil die Bedingungen nicht erfüllt sind`));
      continue;
    }

    if (isMutatingService(call.action) || !query) {
      planned += 1;
      const targetHint = entityIds.length ? ` auf ${entityIds.join(', ')}` : '';
      entries.push(entry(
        'info',
        'action',
        `${call.action}${targetHint} würde ausgeführt (nicht wirklich geschaltet)`,
        call.data,
      ));
      const related = relatedEntities(ctx.states, call.action).filter((id) => !entityIds.includes(id));
      for (const entityId of related.slice(0, 8)) {
        const entity = getEntity(ctx.states, entityId);
        if (!entity) {
          continue;
        }
        entries.push(entry(
          'result',
          'query',
          `Aktueller Wert ${entityLabel(entity, entityId)} (${entityId}) = ${entity.state}`,
          entity.attributes || {},
        ));
      }
      continue;
    }

    planned += 1;
    entries.push(entry('info', 'action', `${call.action} würde ausgeführt`));
  }

  return { planned, queries };
}

async function simulateAutomation(automation = {}, ctx = {}) {
  const entries = [];
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const context = {
    ...ctx,
    now,
    states: ctx.states || {},
    services: ctx.services || {},
  };

  const alias = automation.alias || 'Simulation';
  entries.push(entry('info', 'summary', `Simulation gestartet: ${alias} (Stand ${formatTime(now)})`));
  entries.push(entry('info', 'summary', 'Die Simulation prüft den aktuellen Stand. Trigger werden nicht abgewartet, Aktionen die etwas schalten werden nicht ausgeführt.'));

  const entityIds = [...collectEntityIds(automation)];
  let missingEntities = 0;
  for (const entityId of entityIds) {
    const entity = getEntity(context.states, entityId);
    if (!entity) {
      missingEntities += 1;
      entries.push(entry('error', 'entity', `Keine Verbindung zu ${entityId}`));
      continue;
    }
    const unit = entity.attributes?.unit_of_measurement ? ` ${entity.attributes.unit_of_measurement}` : '';
    entries.push(entry(
      isUnavailable(entity) ? 'warn' : 'ok',
      'entity',
      `Verbindung zu ${entityLabel(entity, entityId)} (${entityId}): ${entity.state}${unit}`,
    ));
  }

  const triggers = asArray(automation.triggers);
  if (!triggers.length) {
    entries.push(entry('warn', 'trigger', 'Kein Trigger vorhanden'));
  }
  for (const trigger of triggers) {
    if (trigger.trigger === 'template' && context.renderTemplate && trigger.value_template) {
      const described = describeTrigger(trigger, context);
      entries.push(entry(described.level, 'trigger', described.message, described.detail));
      try {
        const rendered = await context.renderTemplate(trigger.value_template);
        const fires = templateIsTrue(rendered);
        entries.push(entry(fires ? 'ok' : 'info', 'trigger', `Vorlagen-Trigger ergibt „${rendered}“${fires ? ' — würde jetzt auslösen' : ''}`));
      } catch (error) {
        entries.push(entry('error', 'trigger', `Vorlagen-Trigger fehlgeschlagen: ${error.message || error}`));
      }
      continue;
    }
    const described = describeTrigger(trigger, context);
    entries.push(entry(described.level, 'trigger', described.message, described.detail));
  }

  const conditions = asArray(automation.conditions);
  let conditionsMet = true;
  if (!conditions.length) {
    entries.push(entry('ok', 'condition', 'Keine Bedingungen — würden als erfüllt gelten'));
  } else {
    for (const condition of conditions) {
      const ok = await evaluateCondition(condition, context, entries);
      if (!ok) {
        conditionsMet = false;
      }
    }
  }

  const actions = asArray(automation.actions);
  if (!actions.length) {
    entries.push(entry('warn', 'action', 'Keine Aktionen vorhanden'));
  }
  const { planned, queries } = await simulateActions(actions, context, entries, conditionsMet);

  const errors = entries.filter((item) => item.level === 'error').length;
  const ok = errors === 0;
  const wouldRun = conditionsMet && planned > 0;
  entries.push(entry(
    ok ? (wouldRun ? 'ok' : 'info') : 'error',
    'summary',
    ok
      ? (conditionsMet
        ? `Simulation abgeschlossen: Bedingungen erfüllt, ${planned} Aktion(en) würden laufen${queries ? `, ${queries} Abfrage(n) ausgeführt` : ''}`
        : 'Simulation abgeschlossen: Bedingungen nicht erfüllt, schaltende Aktionen würden nicht laufen')
      : `Simulation mit ${errors} Fehler(n) abgeschlossen`,
  ));

  return {
    summary: {
      ok,
      conditionsMet,
      wouldRun,
      missingEntities,
      plannedActions: planned,
      queries,
      errors,
    },
    entries,
  };
}

module.exports = {
  collectEntityIds,
  isMutatingService,
  isQueryService,
  simulateAutomation,
};
