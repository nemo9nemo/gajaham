import { visibleMaps } from './maps.js';
import { activePlaces } from './places.js';
import { findAccessiblePlace } from './place-edit.js';

export function copyTargets(state, sourceMapId, userId = state.currentUserId) {
  return visibleMaps(state, userId).filter((map) => map.id !== sourceMapId);
}

export function copySources(state, userId = state.currentUserId) {
  const personal = visibleMaps(state, userId).find((map) => map.type === 'personal');
  return personal ? activePlaces(state, personal.id) : [];
}

export function defaultExtras(direction) {
  return direction === 'personal-to-shared' ? { memo: false, photos: false, visits: false } : { memo: false, photos: false };
}

export function readableExtras(state, placeIds, userId = state.currentUserId) {
  const places = [...new Set(placeIds)].map((id) => findAccessiblePlace(state, id, userId)).filter(Boolean);
  return { memo: places.flatMap((place) => place.memo ? [structuredClone(place.memo)] : []), photos: places.reduce((sum, place) => sum + place.photos, 0) };
}

export function buildCopyDraft(state, { sourceMapId, targetMapId, placeIds = [], scope } = {}, userId = state.currentUserId) {
  const source = visibleMaps(state, userId).find((map) => map.id === sourceMapId);
  if (!source) return { ok: false, reason: 'no-access' };
  const target = copyTargets(state, sourceMapId, userId).find((map) => map.id === targetMapId);
  if (!target) return { ok: false, reason: 'invalid-target' };
  const places = activePlaces(state, sourceMapId);
  const ids = scope === 'all' ? places.map((place) => place.id) : [...new Set(placeIds)];
  if (!ids.length) return { ok: false, reason: 'empty' };
  if (ids.some((id) => !places.some((place) => place.id === id))) return { ok: false, reason: 'invalid-place' };
  const direction = `${source.type}-to-${target.type}`;
  return { ok: true, draft: { sourceMapId, targetMapId, placeIds: ids, direction, extras: defaultExtras(direction) } };
}

function copiedPlace(source, targetMapId, id, extras, userId, direction) {
  const fields = ['name', 'category', 'region', 'locationStatus', 'pin', 'placeKey', 'summary', 'menu', 'tip', 'sources', 'sourceUrl', 'sourceAccess', 'hasImage'];
  const base = structuredClone(Object.fromEntries(fields.map((field) => [field, source[field]])));
  if (source.locationStatus !== 'confirmed') Object.assign(base, { locationStatus: 'unconfirmed', pin: null });
  return {
    ...base, id, mapId: targetMapId, wantBy: [], edits: {}, trashed: false, deletedBy: null,
    copyOf: source.id, savedBy: source.savedBy,
    ...(direction.endsWith('-to-shared') ? { senderId: userId } : {}),
    history: [{ type: 'copied', actorId: userId, originalSaverId: source.savedBy, at: '[날짜]' }],
    memo: extras.memo && source.memo ? { ...structuredClone(source.memo), ...(direction === 'personal-to-shared' ? { authorId: userId } : {}) } : null,
    photos: extras.photos ? source.photos : 0,
    visit: direction === 'personal-to-shared' && extras.visits && source.visit === 'visited' ? 'visited' : null,
  };
}

function copyLineage(places, id) {
  const visited = new Set();
  while (id && !visited.has(id)) {
    visited.add(id);
    id = places.find((place) => place.id === id)?.copyOf;
  }
  return visited;
}

export function executeCopy(state, draft, userId = state.currentUserId) {
  const checked = buildCopyDraft(state, draft ?? {}, userId);
  if (!checked.ok) return { ...checked, state };
  // Reuse only extras allowed for the freshly checked direction.
  const extras = Object.fromEntries(Object.keys(checked.draft.extras).map((key) => [key, draft.extras?.[key] === true]));
  let places = [...state.places];
  const items = checked.draft.placeIds.map((sourceId) => {
    const source = state.places.find((place) => place.id === sourceId);
    const item = { sourceId, name: source.name, unconfirmed: source.locationStatus !== 'confirmed', targetPlaceId: null };
    if (state.mock?.copyFailIds.includes(sourceId)) return { ...item, outcome: 'failed' };
    const sourceLineage = copyLineage(places, sourceId);
    const target = places.find((place) => place.mapId === draft.targetMapId && !place.trashed &&
      ((source.locationStatus === 'confirmed' && source.placeKey && place.locationStatus === 'confirmed' && place.placeKey === source.placeKey) ||
        [...copyLineage(places, place.id)].some((id) => sourceLineage.has(id))));
    if (target) {
      const sources = source.sources.filter((entry) => !target.sources.some((existing) => existing.id === entry.id));
      if (sources.length) places = places.map((place) => place.id === target.id ? {
        ...target, sources: [...target.sources, ...structuredClone(sources)],
        history: [...target.history, { type: 'source-added', actorId: userId, at: '[날짜]' }],
      } : place);
      return { ...item, targetPlaceId: target.id, outcome: sources.length ? 'source-added' : 'unchanged' };
    }
    const baseId = `${draft.targetMapId}--${sourceId}`;
    let id = baseId;
    for (let suffix = 2; places.some((place) => place.id === id); suffix += 1) id = `${baseId}-${suffix}`;
    places.push(copiedPlace(source, draft.targetMapId, id, extras, userId, checked.draft.direction));
    return { ...item, targetPlaceId: id, outcome: 'new' };
  });
  const result = { targetMapId: draft.targetMapId, items, total: items.length, done: items.filter((item) => item.outcome !== 'failed').length };
  return { ok: true, result, state: { ...state, places, copy: { ...state.copy, draft: { ...draft, ...checked.draft, extras }, result } } };
}

export function retryFailed(state, result, userId = state.currentUserId) {
  const failed = result?.items.filter((item) => item.outcome === 'failed') ?? [];
  if (!failed.length) return { ok: true, state, result };
  const source = state.places.find((place) => place.id === failed[0].sourceId);
  const retry = executeCopy(state, {
    ...state.copy?.draft, sourceMapId: source?.mapId, targetMapId: result.targetMapId,
    placeIds: failed.map((item) => item.sourceId),
  }, userId);
  if (!retry.ok) return retry;
  const items = result.items.map((item) => retry.result.items.find((next) => next.sourceId === item.sourceId) ?? item);
  const merged = { ...result, items, done: items.filter((item) => item.outcome !== 'failed').length };
  return { ok: true, result: merged, state: { ...retry.state, copy: { ...retry.state.copy, draft: state.copy.draft, result: merged } } };
}
