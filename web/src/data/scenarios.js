import { USERS, MAPS, PLACES, MOCK_CODE } from './mock.js';
import { buildCopyDraft, executeCopy } from '../logic/copy.js';

export const SCENARIOS = [
  'new-visitor', 'dm-intake', 'dm-verify', 'solo', 'solo-empty', 'code-owner',
  'code-entry', 'connected', 'connected-empty-shared', 'already-shared', 'map-error',
  'connected-personal', 'copy-initial', 'copy-preview', 'copy-partial', 'copy-to-personal',
];

export function createScenario(key = 'new-visitor') {
  if (!SCENARIOS.includes(key)) throw new Error(`알 수 없는 시나리오: ${key}`);
  const connected = ['connected', 'connected-empty-shared', 'already-shared', 'map-error',
    'connected-personal', 'copy-initial', 'copy-preview', 'copy-partial', 'copy-to-personal'].includes(key);
  const empty = ['new-visitor', 'dm-intake', 'dm-verify', 'solo-empty'].includes(key);
  let state = {
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
    currentMapId: key === 'connected-personal' ? 'personal-b' : connected ? 'shared-ab' : key === 'code-owner' ? 'personal-a' : 'personal-b',
    intakeLinks: ['dm-intake', 'dm-verify'].includes(key) ? ['instagram.com/reel/[시연용]'] : [],
    copy: { draft: null, result: null }, mock: { copyFailIds: [] },
    ui: {
      query: '', category: '전체', visit: '', senderId: '', view: 'map', sheet: null,
      selectedPlaceId: null, selectionMode: false, selectedIds: [],
      mapError: key === 'map-error', codeInput: '', codeChecked: false, codeResult: null, notice: '',
      copyPick: [], copyChoice: 'selected', copyScope: null, editDraft: null, undo: null,
      navigateTo: null, scrollTarget: null, params: null,
    },
  };
  if (['copy-initial', 'copy-preview', 'copy-partial'].includes(key)) {
    state.places = state.places.filter((place) => place.mapId !== 'shared-ab' || place.id === 'shared-cafe').map((place) => place.id === 'shared-cafe'
      ? { ...place, sources: place.sources.slice(0, 1), history: place.history.slice(0, 1), edits: {} } : place);
  }
  if (['copy-preview', 'copy-partial', 'copy-to-personal'].includes(key)) {
    const toPersonal = key === 'copy-to-personal';
    const { draft } = buildCopyDraft(state, {
      sourceMapId: toPersonal ? 'shared-ab' : 'personal-b', targetMapId: toPersonal ? 'personal-b' : 'shared-ab',
      placeIds: toPersonal ? ['shared-cafe'] : key === 'copy-partial'
        ? ['pb-soup', 'pb-cafe', 'pb-bakery', 'pb-art'] : ['pb-cafe', 'pb-soup', 'pb-bakery'],
    });
    state.copy.draft = { ...draft, back: toPersonal ? '#/place/shared-cafe' : '#/copy/select' };
    if (key === 'copy-partial') {
      state.mock.copyFailIds = ['pb-art'];
      state = executeCopy(state, state.copy.draft).state;
      state.mock = { copyFailIds: [] };
    }
  }
  return state;
}
