import { createScenario } from './data/scenarios.js';
import { cancelCode, confirmConnect, issueCode, redeemCode } from './logic/code.js';
import { hasActiveShared, switchMap, visibleMaps } from './logic/maps.js';
import { buildCopyDraft, copySources, copyTargets, executeCopy, retryFailed } from './logic/copy.js';
import { findAccessiblePlace, updatePlaceInfo, updateLocation, toggleWant, toggleVisited, trashPlace, restorePlace } from './logic/place-edit.js';

const placeHash = (id) => `#/place/${encodeURIComponent(id)}`;
const resetTransient = { copyPick: [], editDraft: null, undo: null, copyScope: null };

function prepareCopy(state, options, back) {
  const result = buildCopyDraft(state, options);
  return result.ok ? updateUi({ ...state, copy: { draft: { ...result.draft, back }, result: null } }, {
    sheet: null, navigateTo: '#/copy/preview', notice: '',
  }) : updateUi(state, { notice: '복제할 장소와 대상 맵을 확인해 주세요.' });
}

function initialCopyMaps(state) {
  const maps = visibleMaps(state);
  return { sourceMapId: maps.find((map) => map.type === 'personal')?.id, targetMapId: maps.find((map) => map.type === 'shared')?.id };
}

function updateUi(state, patch) {
  return { ...state, ui: { ...state.ui, ...patch } };
}

export function reduceAction(state, action, value) {
  // Internal render bookkeeping must not dismiss a notice or its undo action.
  if (action === 'clear-navigate') return updateUi(state, { navigateTo: null });
  if (action === 'clear-scroll') return updateUi(state, { scrollTarget: null });
  if (action === 'route-params') return updateUi(state, { params: value });
  if (action === 'sync-view') return reduceDomainAction(state, 'set-view', value);
  const next = reduceDomainAction(state, action, value);
  if (next === state || ['close-sheet', 'confirm-delete', 'restore-place'].includes(action)) return next;
  const keepNotice = ['copy-code', 'issue-code', 'source', 'copy-execute', 'copy-retry',
    'save-edit', 'save-location', 'directions'].includes(action) || next.ui.notice !== state.ui.notice;
  return updateUi(next, { notice: keepNotice ? next.ui.notice : '', undo: null });
}

function reduceDomainAction(state, action, value) {
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
    case 'close-sheet': return updateUi(state, {
      ...resetTransient, copyPick: state.ui.sheet ? [] : state.ui.copyPick, sheet: null, selectedPlaceId: null,
    });
    case 'switch-map': {
      const next = switchMap(state, value);
      return next === state ? state : updateUi(next, {
        sheet: null, selectedPlaceId: null, query: '', category: '전체', visit: '', senderId: '', selectionMode: false, selectedIds: [],
        ...resetTransient,
      });
    }
    case 'open-place': {
      const accessible = visibleMaps(state).some((map) => map.id === state.currentMapId);
      return accessible && state.places.some((place) => place.id === value && place.mapId === state.currentMapId && !place.trashed)
        ? updateUi(state, { sheet: 'place', selectedPlaceId: value }) : state;
    }
    case 'source': {
      const place = findAccessiblePlace(state, value);
      return place
        ? updateUi(state, { notice: `원본 링크: ${place.sourceUrl}` }) : state;
    }
    case 'query': return updateUi(state, { query: value, sheet: null, selectedIds: [] });
    case 'set-view': return updateUi(state, { view: value, selectionMode: false, selectedIds: [] });
    case 'clear-query': return updateUi(state, { query: '' });
    case 'clear-filters': return updateUi(state, { category: '전체', visit: '', senderId: '' });
    case 'category': return updateUi(state, { category: value, sheet: null, selectedIds: [] });
    case 'visit': return updateUi(state, { visit: value, selectedIds: [] });
    case 'sender': return updateUi(state, { senderId: value, selectedIds: [] });
    case 'toggle-selection': return updateUi(state, { selectionMode: !state.ui.selectionMode, selectedIds: [] });
    case 'select-place': {
      const allowed = visibleMaps(state).some((map) => map.id === state.currentMapId) &&
        state.places.some((place) => place.id === value && place.mapId === state.currentMapId && !place.trashed);
      if (!allowed) return state;
      const selectedIds = state.ui.selectedIds.includes(value)
        ? state.ui.selectedIds.filter((id) => id !== value) : [...state.ui.selectedIds, value];
      return updateUi(state, { selectedIds });
    }
    case 'copy-choice': return ['none', 'selected', 'all'].includes(value) ? updateUi(state, { copyChoice: value }) : state;
    case 'copy-initial-next': {
      const maps = initialCopyMaps(state);
      if (!maps.targetMapId) return updateUi(state, { notice: '공유 맵이 아직 없어요' });
      if (state.ui.copyChoice === 'none') return updateUi(reduceDomainAction(state, 'show-shared'), { navigateTo: '#/map' });
      if (state.ui.copyChoice === 'selected') return updateUi(state, { copyPick: [], navigateTo: '#/copy/select' });
      return prepareCopy(state, { ...maps, scope: 'all' }, '#/copy/initial');
    }
    case 'copy-pick': {
      if (!copySources(state).some((place) => place.id === value)) return state;
      return updateUi(state, { copyPick: state.ui.copyPick.includes(value) ? state.ui.copyPick.filter((id) => id !== value) : [...state.ui.copyPick, value] });
    }
    case 'copy-select-start': return updateUi(state, { copyPick: [], navigateTo: '#/copy/select' });
    case 'copy-pick-preview': return prepareCopy(state, { ...initialCopyMaps(state), placeIds: state.ui.copyPick }, '#/copy/select');
    case 'open-copy': {
      const one = typeof value === 'string' && value.startsWith('one:');
      if (one ? !findAccessiblePlace(state, value.slice(4)) : !['selected', 'all'].includes(value) || !visibleMaps(state).some((map) => map.id === state.currentMapId)) return state;
      return updateUi(state, { sheet: 'copy', copyScope: value });
    }
    case 'copy-scope': return ['selected', 'all'].includes(value) ? updateUi(state, { copyScope: value }) : state;
    case 'copy-sheet-preview': {
      const oneId = state.ui.copyScope?.startsWith('one:') ? state.ui.copyScope.slice(4) : null;
      const sourceMapId = oneId ? findAccessiblePlace(state, oneId)?.mapId : state.currentMapId;
      return prepareCopy(state, { sourceMapId, targetMapId: copyTargets(state, sourceMapId)[0]?.id,
        placeIds: oneId ? [oneId] : state.ui.selectedIds, scope: state.ui.copyScope === 'all' ? 'all' : undefined,
      }, oneId ? placeHash(oneId) : '#/map?view=list');
    }
    case 'toggle-extra': {
      const draft = state.copy.draft;
      return draft && Object.hasOwn(draft.extras, value) ? { ...state, copy: { ...state.copy, draft: {
        ...draft, extras: { ...draft.extras, [value]: !draft.extras[value] },
      } } } : state;
    }
    case 'copy-execute':
    case 'copy-retry': {
      const result = action === 'copy-execute' ? executeCopy(state, state.copy.draft) : retryFailed(state, state.copy.result);
      return result.ok ? updateUi(result.state, { notice: '', navigateTo: '#/copy/result' }) : updateUi(state, {
        notice: '대상 맵에 접근할 수 없어 복제하지 않았어요. 연결 상태를 확인해 주세요.',
      });
    }
    case 'copy-done': {
      const target = state.copy.result?.targetMapId;
      if (!visibleMaps(state).some((map) => map.id === target)) return state;
      return updateUi({ ...switchMap(state, target), copy: { draft: null, result: null } }, {
        ...resetTransient, sheet: null, selectedPlaceId: null, selectedIds: [], selectionMode: false,
        query: '', category: '전체', visit: '', senderId: '', navigateTo: '#/map',
      });
    }
    case 'show-map': {
      if (!visibleMaps(state).some((map) => map.id === value)) return state;
      return updateUi(switchMap(state, value), { ...resetTransient, sheet: null, selectedPlaceId: null, navigateTo: '#/map' });
    }
    case 'toggle-want': return toggleWant(state, value);
    case 'toggle-visited': return toggleVisited(state, value);
    case 'edit-field':
    case 'edit-category': {
      const id = state.ui.params?.id;
      if (!findAccessiblePlace(state, id)) return state;
      const draft = state.ui.editDraft?.placeId === id ? state.ui.editDraft : { placeId: id };
      const field = action === 'edit-category' ? 'category' : value?.field;
      if (!['name', 'category', 'menuName', 'memoText'].includes(field)) return state;
      return updateUi(state, { editDraft: { ...draft, [field]: action === 'edit-category' ? value : value.value } });
    }
    case 'save-edit': {
      if (!findAccessiblePlace(state, value)) return state;
      const next = updatePlaceInfo(state, value, state.ui.editDraft?.placeId === value ? state.ui.editDraft : {});
      return updateUi(next, { editDraft: null, notice: '저장했어요', navigateTo: placeHash(value) });
    }
    case 'save-location': {
      const next = updateLocation(state, value, { x: 50, y: 50 });
      return next === state ? state : updateUi(next, { notice: '위치를 저장했어요', navigateTo: placeHash(value) });
    }
    case 'open-delete': return findAccessiblePlace(state, value) ? updateUi(state, { sheet: 'delete' }) : state;
    case 'confirm-delete': {
      const place = findAccessiblePlace(state, value);
      const next = trashPlace(state, value);
      return next === state ? state : updateUi(switchMap(next, place.mapId), {
        sheet: null, selectedPlaceId: null, selectedIds: [], notice: '휴지통으로 이동했어요',
        undo: { action: 'restore-place', id: value }, navigateTo: '#/map',
      });
    }
    case 'restore-place': {
      const next = restorePlace(state, value);
      return next === state ? state : updateUi(next, { undo: null, notice: '되돌렸어요' });
    }
    case 'directions': return updateUi(state, { notice: '외부 지도 앱 연결은 아직 준비 중이에요' });
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
