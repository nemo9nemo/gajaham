import { USERS, MAPS, PLACES, MOCK_CODE } from './mock.js';

export const SCENARIOS = [
  'new-visitor', 'dm-intake', 'dm-verify', 'solo', 'solo-empty', 'code-owner',
  'code-entry', 'connected', 'connected-empty-shared', 'already-shared', 'map-error',
];

export function createScenario(key = 'new-visitor') {
  if (!SCENARIOS.includes(key)) throw new Error(`알 수 없는 시나리오: ${key}`);
  const connected = ['connected', 'connected-empty-shared', 'already-shared', 'map-error'].includes(key);
  const empty = ['new-visitor', 'dm-intake', 'dm-verify', 'solo-empty'].includes(key);
  const state = {
    users: structuredClone(USERS),
    maps: structuredClone(MAPS.filter((map) => map.type === 'personal' || connected)),
    places: structuredClone(PLACES.filter((place) =>
      place.mapId === 'personal-a' || (!empty && place.mapId === 'personal-b') ||
      (connected && key !== 'connected-empty-shared' && place.mapId === 'shared-ab'))),
    codes: structuredClone(['code-owner', 'code-entry', 'already-shared'].includes(key) ? [MOCK_CODE] : []),
    currentUserId: key === 'code-owner' ? 'user-a' : 'user-b',
    loggedIn: !['new-visitor', 'dm-intake'].includes(key),
    dmAccountVerified: !['new-visitor', 'dm-intake', 'dm-verify'].includes(key),
    dmDefaultTarget: 'personal',
    currentMapId: connected ? 'shared-ab' : key === 'code-owner' ? 'personal-a' : 'personal-b',
    intakeLinks: ['dm-intake', 'dm-verify'].includes(key) ? ['instagram.com/reel/[시연용]'] : [],
    ui: {
      query: '', category: '전체', visit: '', senderId: '', view: 'map', sheet: null,
      selectedPlaceId: null, selectionMode: false, selectedIds: [],
      mapError: key === 'map-error', codeInput: '', codeChecked: false, codeResult: null, notice: '',
    },
  };
  return state;
}
