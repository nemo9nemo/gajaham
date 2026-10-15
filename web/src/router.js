import { startScreen, intakeScreen, verifyScreen, saveTargetScreen } from './screens/start/onboarding.js';
import { togetherScreen, codeStatusScreen, codeEntryScreen, connectedScreen, loginRequiredScreen } from './screens/start/connection.js';
import { mapScreen } from './screens/map/screen.js';
import { catalogScreen } from './screens/catalog.js';
import { demoDmScreen } from './screens/demo-dm.js';
import { placeholderScreen } from './screens/placeholder.js';

export const ROUTES = {
  '/start': startScreen, '/demo/dm': demoDmScreen, '/intake': intakeScreen,
  '/verify': verifyScreen, '/save-target': saveTargetScreen, '/together': togetherScreen,
  '/code-status': codeStatusScreen, '/code-enter': codeEntryScreen, '/connected': connectedScreen,
  '/map': mapScreen, '/catalog': catalogScreen, '/todo/:briefId/:screenId': placeholderScreen,
};

export function parseRoute(hash = '') {
  const [rawPath, query = ''] = hash.replace(/^#/, '').split('?');
  const path = rawPath || '/start';
  if (Object.hasOwn(ROUTES, path) && !path.includes(':')) {
    return { path, view: new URLSearchParams(query).get('view') === 'list' ? 'list' : 'map' };
  }
  const todo = /^\/todo\/([^/]+)\/([^/]+)$/.exec(path);
  if (todo) {
    try { return { path: '/todo/:briefId/:screenId', todo: { briefId: decodeURIComponent(todo[1]), screenId: decodeURIComponent(todo[2]) } }; }
    catch { /* Invalid escapes use the same fallback as an unknown route. */ }
  }
  return { path: '/start', fallback: path !== '/start' };
}

export function renderRoute(state, hash) {
  const route = parseRoute(hash);
  if (!state.loggedIn && ['/map', '/verify', '/save-target', '/connected'].includes(route.path)) return loginRequiredScreen();
  return ROUTES[route.path]({ ...state, ui: { ...state.ui, ...(route.path === '/map' ? { view: route.view } : {}), todo: route.todo } });
}
