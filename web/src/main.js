import { createStore } from './store.js';
import { CATALOG, catalogState } from './screens/catalog.js';
import { parseRoute, renderRoute } from './router.js';
import { notice } from './components/notice.js';

const app = document.querySelector('#app');
const store = createStore();
let lastSheet = null;
let sheetTrigger = null;
let preserveRouteUi = false;

function render() {
  const route = parseRoute(window.location.hash);
  if (route.fallback) window.history.replaceState(null, '', '#/start');
  if (route.path === '/map' && store.getState().ui.view !== route.view) store.dispatch('set-view', route.view);
  const state = store.getState();
  const focused = document.activeElement;
  const focusedId = focused?.id;
  const focusedAction = focused?.dataset?.action;
  const focusedDataId = focused?.dataset?.id;
  const selection = focused instanceof HTMLInputElement && focused.type !== 'search'
    ? [focused.selectionStart, focused.selectionEnd] : null;
  const searching = focused instanceof HTMLInputElement && focused.type === 'search'
    ? [focused.selectionStart, focused.selectionEnd] : null;
  const hadSheet = lastSheet;
  app.innerHTML = renderRoute(state, window.location.hash) +
    (state.ui.notice && !state.ui.sheet ? '<div class="toast">' + notice(state.ui.notice) + '</div>' : '') +
    '<a class="catalog-access" href="#/catalog">화면 카탈로그</a>';
  lastSheet = state.ui.sheet;
  if (focusedId) {
    const replacement = document.getElementById(focusedId);
    replacement?.focus({ preventScroll: true });
    if (replacement instanceof HTMLInputElement && (selection || searching)) {
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
  if (['open-maps', 'open-place'].includes(action)) sheetTrigger = { action, id: value };
  const state = store.dispatch(action, value);
  const destinations = {
    'login-start': '#/map', 'login-intake': '#/verify', 'verify-account': '#/save-target',
  };
  if (action === 'confirm-connect' && state.ui.connectedMapId) navigate('#/connected');
  else if (destinations[action] || href) navigate(destinations[action] || href);
  else render();
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target || target.matches('input, form, button[type="submit"]')) return;
  event.preventDefault();
  act(target.dataset.action, target.dataset.id, target.getAttribute('href'));
});

app.addEventListener('input', (event) => {
  const input = event.target;
  if (!input.matches('input[data-action]')) return;
  act(input.dataset.action, input.type === 'checkbox' ? input.dataset.id : input.value);
});

app.addEventListener('submit', (event) => {
  const form = event.target.closest('form[data-action]');
  if (!form) return;
  event.preventDefault();
  act(form.dataset.action);
});

app.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && store.getState().ui.sheet) {
    event.preventDefault();
    act('close-sheet');
  }
});

window.addEventListener('hashchange', () => {
  if (!preserveRouteUi) store.dispatch('close-sheet');
  preserveRouteUi = false;
  render();
  window.scrollTo(0, 0);
});

render();
