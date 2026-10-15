export function visibleMaps(state, userId = state.currentUserId) {
  return state.maps.filter((map) => map.type === 'personal'
    ? map.ownerId === userId
    : map.active && map.memberIds.includes(userId));
}

export function hasActiveShared(state, userId = state.currentUserId) {
  return state.maps.some((map) => map.type === 'shared' && map.active && map.memberIds.includes(userId));
}

export function switchMap(state, mapId) {
  return visibleMaps(state).some((map) => map.id === mapId)
    ? { ...state, currentMapId: mapId } : state;
}
