import { createScenario } from './data/scenarios.js';
import { cancelCode, confirmConnect, issueCode, redeemCode } from './logic/code.js';
import { hasActiveShared, switchMap, visibleMaps } from './logic/maps.js';

function updateUi(state, patch) {
  return { ...state, ui: { ...state.ui, ...patch } };
}

export function reduceAction(state, action, value) {
  switch (action) {
    case 'login-start': return createScenario('solo-empty');
    case 'login-intake': return { ...state, loggedIn: true };
    case 'login-code': return { ...state, loggedIn: true };
    case 'verify-account': return { ...state, dmAccountVerified: true };
    case 'demo-intake': return createScenario('dm-intake');
    case 'open-together':
      return state.loggedIn && !hasActiveShared(state) &&
        !state.codes.some((code) => code.ownerId === state.currentUserId)
        ? { ...state, codes: issueCode(state.codes, state.currentUserId, Date.now()) } : state;
    case 'issue-code':
      return state.loggedIn && !hasActiveShared(state)
        ? updateUi({ ...state, codes: issueCode(state.codes, state.currentUserId, Date.now()) }, { notice: '새 코드를 만들었어요.' }) : state;
    case 'cancel-code': {
      const code = state.codes.findLast((item) => item.ownerId === state.currentUserId);
      return code ? { ...state, codes: cancelCode(state.codes, code.id) } : state;
    }
    case 'copy-code': return updateUi(state, { notice: '복사했어요' });
    case 'code-input': return updateUi(state, { codeInput: value, codeResult: null, codeChecked: false });
    case 'check-code': return updateUi(state, {
      codeChecked: true, codeResult: redeemCode(state, state.ui.codeInput.trim(), state.currentUserId),
    });
    case 'confirm-connect': {
      const result = confirmConnect(state, state.ui.codeInput.trim(), state.currentUserId);
      return updateUi(result.state, { codeResult: result.ok ? { ok: true } : { ok: false, reason: result.reason, status: result.status }, connectedMapId: result.ok ? result.sharedMapId : null });
    }
    case 'show-shared': {
      const shared = visibleMaps(state).find((map) => map.type === 'shared');
      return shared ? updateUi(switchMap(state, shared.id), { sheet: null, query: '', category: '전체', visit: '', senderId: '' }) : state;
    }
    case 'open-maps': return updateUi(state, { sheet: state.ui.sheet === 'maps' ? null : 'maps', selectedPlaceId: null });
    case 'close-sheet': return updateUi(state, { sheet: null, selectedPlaceId: null });
    case 'switch-map': {
      const next = switchMap(state, value);
      return next === state ? state : updateUi(next, {
        sheet: null, selectedPlaceId: null, query: '', category: '전체', visit: '', senderId: '', selectionMode: false, selectedIds: [],
      });
    }
    case 'open-place': {
      const accessible = visibleMaps(state).some((map) => map.id === state.currentMapId);
      return accessible && state.places.some((place) => place.id === value && place.mapId === state.currentMapId)
        ? updateUi(state, { sheet: 'place', selectedPlaceId: value }) : state;
    }
    case 'source': {
      const place = state.places.find((item) => item.id === value && item.mapId === state.currentMapId);
      return visibleMaps(state).some((map) => map.id === state.currentMapId) && place
        ? updateUi(state, { notice: `원본 링크: ${place.sourceUrl}` }) : state;
    }
    case 'query': return updateUi(state, { query: value, sheet: null, selectedIds: [] });
    case 'set-view': return updateUi(state, { view: value });
    case 'clear-query': return updateUi(state, { query: '' });
    case 'clear-filters': return updateUi(state, { category: '전체', visit: '', senderId: '' });
    case 'category': return updateUi(state, { category: value, sheet: null, selectedIds: [] });
    case 'visit': return updateUi(state, { visit: value, selectedIds: [] });
    case 'sender': return updateUi(state, { senderId: value, selectedIds: [] });
    case 'toggle-selection': return updateUi(state, { selectionMode: !state.ui.selectionMode, selectedIds: [] });
    case 'select-place': {
      const allowed = visibleMaps(state).some((map) => map.id === state.currentMapId) &&
        state.places.some((place) => place.id === value && place.mapId === state.currentMapId);
      if (!allowed) return state;
      const selectedIds = state.ui.selectedIds.includes(value)
        ? state.ui.selectedIds.filter((id) => id !== value) : [...state.ui.selectedIds, value];
      return updateUi(state, { selectedIds });
    }
    case 'retry-map': return updateUi(state, { mapError: false });
    default: return state;
  }
}

export function createStore(initialState = createScenario()) {
  let state = initialState;
  return {
    getState: () => state,
    replaceState(nextState) { state = nextState; return state; },
    dispatch(action, value) { state = reduceAction(state, action, value); return state; },
    applyScenario(key, ui = {}) {
      const next = createScenario(key);
      state = { ...next, ui: { ...next.ui, ...ui } };
      return state;
    },
  };
}
