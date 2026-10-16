import { createStore } from './store.js';
import { CATALOG, catalogState } from './screens/catalog.js';
import { parseRoute, renderRoute } from './router.js';
import { html } from './html.js';

const app = document.querySelector('#app');
const store = createStore();
const composingInputs = new WeakSet();
let lastSheet = null;
let sheetTrigger = null;
let preserveRouteUi = false;

function isModalSheet(sheet) {
  return sheet === 'copy' || sheet === 'delete';
}

function modalControls(modal) {
  return [...(modal?.querySelectorAll('a[href], button, input, select, textarea, [tabindex]') ?? [])]
    .filter((element) => !element.disabled && element.tabIndex >= 0 && !element.closest('[inert], [hidden]'));
}

function render() {
  const destination = store.getState().ui.navigateTo;
  if (destination) {
    store.dispatch('clear-navigate');
    preserveRouteUi = true;
    navigate(destination);
    return;
  }
  const route = parseRoute(window.location.hash);
  if (route.fallback) window.history.replaceState(null, '', '#/start');
  if (route.path === '/map' && store.getState().ui.view !== route.view) store.dispatch('sync-view', route.view);
  store.dispatch('route-params', route.params ?? null);
  const state = store.getState();
  const focused = document.activeElement;
  const focusedId = focused?.id;
  const focusedAction = focused?.dataset?.action;
  const focusedDataId = focused?.dataset?.id;
  const selection = (focused instanceof HTMLInputElement || focused?.tagName === 'TEXTAREA') && focused.type !== 'search'
    ? [focused.selectionStart, focused.selectionEnd] : null;
  const searching = focused instanceof HTMLInputElement && focused.type === 'search'
    ? [focused.selectionStart, focused.selectionEnd] : null;
  const hadSheet = lastSheet;
  app.innerHTML = renderRoute(state, window.location.hash) +
    (isModalSheet(state.ui.sheet) ? '<div inert>' : '') +
    (state.ui.notice && !state.ui.sheet ? '<div class="toast" role="status">' + html`<span>${state.ui.notice}</span>` +
      (state.ui.undo ? html`<button type="button" data-action="${state.ui.undo.action}" data-id="${state.ui.undo.id}">되돌리기</button>` : '') + '</div>' : '') +
    '<a class="catalog-access" href="#/catalog">화면 카탈로그</a>' +
    (isModalSheet(state.ui.sheet) ? '</div>' : '');
  lastSheet = state.ui.sheet;
  if (focusedId) {
    const replacement = document.getElementById(focusedId);
    replacement?.focus({ preventScroll: true });
    if ((replacement instanceof HTMLInputElement || replacement?.tagName === 'TEXTAREA') && (selection || searching)) {
      const [start, end] = selection || searching;
      replacement.setSelectionRange(start, end);
    }
  } else {
    const candidates = [...app.querySelectorAll('[data-action]')];
    const replacement = focusedAction && candidates.find((element) => element.dataset.action === focusedAction && element.dataset.id === focusedDataId);
    if (replacement) replacement.focus({ preventScroll: true });
    else if (hadSheet && !lastSheet && sheetTrigger) {
      candidates.find((element) => element.dataset.action === sheetTrigger.action && element.dataset.id === sheetTrigger.id)?.focus();
    }
  }
  if (isModalSheet(state.ui.sheet) && hadSheet !== state.ui.sheet) {
    const modal = app.querySelector?.('[aria-modal="true"]');
    (app.querySelector?.('[data-autofocus]') ?? modalControls(modal)[0])?.focus();
  }
  if (state.ui.scrollTarget) {
    document.getElementById(state.ui.scrollTarget)?.scrollIntoView();
    store.dispatch('clear-scroll');
  }
}

function navigate(hash) {
  if (window.location.hash === hash) { preserveRouteUi = false; render(); }
  else window.location.hash = hash;
}

function act(action, value, href) {
  if (action === 'catalog') {
    const entry = CATALOG.find((item) => item.id === value);
    if (entry) {
      store.replaceState(catalogState(entry));
      preserveRouteUi = true;
      navigate(entry.route);
    }
    return;
  }
  if (['open-maps', 'open-place', 'open-copy', 'open-delete'].includes(action)) sheetTrigger = { action, id: value };
  const state = store.dispatch(action, value);
  const destinations = {
    'login-start': '#/map', 'login-intake': '#/verify', 'verify-account': '#/save-target',
  };
  if (state.ui.navigateTo) render();
  else if (action === 'confirm-connect' && state.ui.connectedMapId) navigate('#/connected');
  else if (destinations[action] || href) navigate(destinations[action] || href);
  else render();
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target || target.tagName === 'TEXTAREA' || target.matches('input, form, button[type="submit"]')) return;
  event.preventDefault();
  act(target.dataset.action, target.dataset.id, target.getAttribute('href'));
});

function isActionInput(input) {
  return input.matches('input[data-action]') || (input.tagName === 'TEXTAREA' && !!input.dataset.action);
}

function inputValue(input) {
  return input.dataset.field ? { field: input.dataset.field, value: input.value }
    : input.type === 'checkbox' ? input.dataset.id : input.value;
}

app.addEventListener('compositionstart', (event) => {
  if (isActionInput(event.target)) composingInputs.add(event.target);
});

app.addEventListener('compositionend', (event) => {
  const input = event.target;
  if (!isActionInput(input)) return;
  composingInputs.delete(input);
  act(input.dataset.action, inputValue(input));
});

app.addEventListener('input', (event) => {
  const input = event.target;
  if (!isActionInput(input) || composingInputs.has(input) || event.isComposing) return;
  act(input.dataset.action, inputValue(input));
});

app.addEventListener('submit', (event) => {
  const form = event.target.closest('form[data-action]');
  if (!form) return;
  event.preventDefault();
  act(form.dataset.action);
});

app.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && isModalSheet(store.getState().ui.sheet)) {
    const modal = app.querySelector('[aria-modal="true"]');
    if (!modal) return;
    const controls = modalControls(modal);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (!controls.includes(document.activeElement) || document.activeElement === (event.shiftKey ? first : last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }
  if (event.key === 'Escape' && store.getState().ui.sheet) {
    event.preventDefault();
    act('close-sheet');
  }
});

window.addEventListener('hashchange', () => {
  if (!preserveRouteUi) store.dispatch('close-sheet');
  preserveRouteUi = false;
  window.scrollTo(0, 0);
  render();
});

render();
