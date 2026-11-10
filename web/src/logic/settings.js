import { visibleMaps } from './maps.js';
import { intakeTargets, ownedJobs } from './intake.js';

export function setDmDefault(state, target) {
  return state.loggedIn && ['personal', 'shared', 'both'].includes(target) && intakeTargets(state, target).length
    ? { ...state, dmDefaultTarget: target } : state;
}

export function trashedPlaces(state, mapId) {
  return state.loggedIn && visibleMaps(state).some((map) => map.id === mapId)
    ? state.places.filter((place) => place.mapId === mapId && place.trashed) : [];
}

export function exportRecords(state, mapIds) {
  if (!state.loggedIn) return { maps: [], processing: [] };
  const ids = new Set(visibleMaps(state).filter((map) => mapIds.includes(map.id)).map((map) => map.id));
  const fields = ['name', 'category', 'region', 'locationStatus', 'memo', 'sourceUrl', 'visit', 'trashed'];
  return {
    maps: visibleMaps(state).filter((map) => ids.has(map.id)).map((map) => ({ name: map.name, type: map.type,
      places: state.places.filter((place) => place.mapId === map.id).map((place) => structuredClone(Object.fromEntries(fields.map((field) => [field, place[field]])))),
    })),
    processing: ownedJobs(state).filter((job) => !job.parentId && [job, ...ownedJobs(state).filter((child) => child.parentId === job.id)]
      .some((part) => [...part.targetMapIds, ...part.results.map((result) => result.mapId)].some((id) => ids.has(id)))).map((job) => ({
      sourceUrl: job.originalUrl ?? job.sourceUrl, stage: job.stage,
      results: [job, ...ownedJobs(state).filter((child) => child.parentId === job.id)].flatMap((part) => part.results)
        .filter((result) => ids.has(result.mapId)).map((result) => ({ status: result.status, reason: result.reason ?? null })),
    })),
  };
}

export function leaveSharedMap(state, mapId) {
  if (!state.loggedIn) return state;
  const map = visibleMaps(state).find((item) => item.id === mapId && item.type === 'shared');
  if (!map) return state;
  const personal = visibleMaps(state).find((item) => item.type === 'personal');
  const nextMaps = state.maps.map((item) => {
    if (item.id !== mapId) return item;
    const memberIds = item.memberIds.filter((id) => id !== state.currentUserId);
    return { ...item, memberIds, active: memberIds.length > 0 };
  });
  return { ...state, maps: nextMaps, currentMapId: personal.id,
    dmDefaultTarget: 'personal',
    endedShared: { id: map.id, name: map.name, previousDefault: state.dmDefaultTarget },
    ui: { ...state.ui, sheet: null, selectedPlaceId: null, selectedIds: [], selectionMode: false,
      targetChoice: personal.id, settingsMapId: personal.id, dmChoice: 'personal', exportMapIds: [personal.id] },
  };
}
