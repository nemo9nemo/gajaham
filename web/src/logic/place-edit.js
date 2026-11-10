import { visibleMaps } from './maps.js';

export function findAccessiblePlace(state, placeId, userId = state.currentUserId) {
  const place = state.places.find((item) => item.id === placeId && !item.trashed);
  return place && visibleMaps(state, userId).some((map) => map.id === place.mapId) ? place : null;
}

function replacePlace(state, place, patch) {
  return { ...state, places: state.places.map((item) => item.id === place.id ? { ...place, ...patch } : item) };
}

export function updatePlaceInfo(state, placeId, patch, userId = state.currentUserId) {
  const place = findAccessiblePlace(state, placeId, userId);
  if (!place) return state;
  const changes = {};
  const edits = { ...place.edits };
  const history = [...place.history];
  for (const [input, field, label, previous] of [
    ['name', 'name', '장소명', place.name], ['category', 'category', '카테고리', place.category],
    ['menuName', 'menu', '메뉴', place.menu?.name ?? ''], ['memoText', 'memo', '메모', place.memo?.text ?? ''],
  ]) {
    if (!Object.hasOwn(patch, input) || typeof patch[input] !== 'string' || patch[input] === previous) continue;
    const value = patch[input];
    changes[field] = field === 'memo' ? (value ? { text: value, authorId: userId } : null)
      : field === 'menu' ? (value ? { ...place.menu, name: value, kind: place.menu?.kind ?? 'mentioned' } : null) : value;
    edits[field] = userId;
    history.push({ type: 'edited', field: label, actorId: userId, at: '[날짜]' });
  }
  return Object.keys(changes).length ? replacePlace(state, place, { ...changes, edits, history }) : state;
}

export function updateLocation(state, placeId, pin, userId = state.currentUserId) {
  const place = findAccessiblePlace(state, placeId, userId);
  if (!place || !pin || !Number.isFinite(pin.x) || !Number.isFinite(pin.y)) return state;
  return replacePlace(state, place, {
    pin: { x: pin.x, y: pin.y }, locationStatus: 'confirmed', edits: { ...place.edits, location: userId },
    history: [...place.history, { type: 'edited', field: '위치', actorId: userId, at: '[날짜]' }],
  });
}

export function toggleWant(state, placeId, userId = state.currentUserId) {
  const place = findAccessiblePlace(state, placeId, userId);
  if (!place) return state;
  const wantBy = place.wantBy.includes(userId) ? place.wantBy.filter((id) => id !== userId) : [...place.wantBy, userId];
  return replacePlace(state, place, { wantBy, visit: place.visit === 'visited' ? 'visited' : wantBy.length ? 'want' : null });
}

export function toggleVisited(state, placeId, userId = state.currentUserId) {
  const place = findAccessiblePlace(state, placeId, userId);
  return place ? replacePlace(state, place, { visit: place.visit === 'visited' ? (place.wantBy.length ? 'want' : null) : 'visited' }) : state;
}

export function trashPlace(state, placeId, userId = state.currentUserId) {
  const place = findAccessiblePlace(state, placeId, userId);
  return place ? replacePlace(state, place, {
    trashed: true, deletedBy: userId,
    history: [...place.history, { type: 'deleted', actorId: userId, at: '[날짜]' }],
  }) : state;
}

export function restorePlace(state, placeId, userId = state.currentUserId) {
  const place = state.places.find((item) => item.id === placeId && item.trashed);
  if (!place || !visibleMaps(state, userId).some((map) => map.id === place.mapId)) return state;
  return replacePlace(state, place, {
    trashed: false, deletedBy: null,
    history: [...place.history, { type: 'restored', actorId: userId, at: '[날짜]' }],
  });
}
