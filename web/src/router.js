import { startScreen, intakeScreen, verifyScreen, saveTargetScreen } from './screens/start/onboarding.js';
import { togetherScreen, codeStatusScreen, codeEntryScreen, connectedScreen, loginRequiredScreen } from './screens/start/connection.js';
import { mapScreen } from './screens/map/screen.js';
import { catalogScreen } from './screens/catalog.js';
import { demoDmScreen } from './screens/demo-dm.js';
import { placeholderScreen } from './screens/placeholder.js';
import { initialCopyScreen, selectCopyScreen } from './screens/copy/initial.js';
import { copyPreviewScreen } from './screens/copy/preview.js';
import { copyResultScreen } from './screens/copy/result.js';
import { placeDetailScreen } from './screens/place/detail.js';
import { placeEditScreen } from './screens/place/edit.js';
import { placeLocationScreen } from './screens/place/location.js';
import { placeHistoryScreen } from './screens/place/history.js';
import { linkNewScreen, linkReceiptScreen, linkResultScreen, unsupportedLinkScreen } from './screens/intake/screens.js';
import { inboxScreen, jobDetailScreen, jobTargetScreen, jobResolveScreen, jobSearchScreen, jobSupplementScreen,
  jobMultipleScreen, jobNoPlaceScreen, jobDelayedScreen, jobEndedScreen } from './screens/inbox/screens.js';
import { appointmentHomeScreen, appointmentChooseScreen, appointmentCompareScreen, appointmentReplaceScreen, appointmentVisitedScreen } from './screens/appointments/screens.js';
import { settingsHomeScreen, settingsDmScreen, settingsExportScreen, settingsTrashScreen, settingsLeaveScreen, settingsEndedScreen, settingsAccountScreen } from './screens/settings/screens.js';

export const ROUTES = {
  '/start': startScreen, '/demo/dm': demoDmScreen, '/intake': intakeScreen,
  '/verify': verifyScreen, '/save-target': saveTargetScreen, '/together': togetherScreen,
  '/code-status': codeStatusScreen, '/code-enter': codeEntryScreen, '/connected': connectedScreen,
  '/map': mapScreen, '/catalog': catalogScreen, '/todo/:briefId/:screenId': placeholderScreen,
  '/copy/initial': initialCopyScreen, '/copy/select': selectCopyScreen,
  '/copy/preview': copyPreviewScreen, '/copy/result': copyResultScreen,
  '/place/:id': placeDetailScreen, '/place/:id/edit': placeEditScreen,
  '/place/:id/location': placeLocationScreen, '/place/:id/history': placeHistoryScreen,
  '/links/new': linkNewScreen, '/links/receipt/:id': linkReceiptScreen, '/links/result/:id': linkResultScreen,
  '/links/unsupported/:id': unsupportedLinkScreen, '/inbox': inboxScreen, '/inbox/:id': jobDetailScreen,
  '/inbox/:id/target': jobTargetScreen, '/inbox/:id/resolve': jobResolveScreen, '/inbox/:id/search': jobSearchScreen,
  '/inbox/:id/supplement': jobSupplementScreen, '/inbox/:id/multiple': jobMultipleScreen,
  '/inbox/:id/no-place': jobNoPlaceScreen, '/inbox/:id/delayed': jobDelayedScreen, '/inbox/:id/ended': jobEndedScreen,
  '/appointments': appointmentHomeScreen, '/appointments/choose': appointmentChooseScreen,
  '/appointments/compare': appointmentCompareScreen, '/appointments/replace': appointmentReplaceScreen,
  '/appointments/visited': appointmentVisitedScreen, '/settings': settingsHomeScreen, '/settings/dm': settingsDmScreen,
  '/settings/export': settingsExportScreen, '/settings/trash': settingsTrashScreen, '/settings/leave': settingsLeaveScreen,
  '/settings/ended': settingsEndedScreen, '/settings/account': settingsAccountScreen,
};

export function parseRoute(hash = '') {
  const [rawPath, query = ''] = hash.replace(/^#/, '').split('?');
  const path = rawPath || '/start';
  if (Object.hasOwn(ROUTES, path) && !path.includes(':')) {
    return { path, view: new URLSearchParams(query).get('view') === 'list' ? 'list' : 'map' };
  }
  const place = /^\/place\/([^/]+)(\/(edit|location|history))?$/.exec(path);
  if (place) {
    try { return { path: `/place/:id${place[2] ?? ''}`, params: { id: decodeURIComponent(place[1]) } }; }
    catch { /* Malformed encoded IDs follow the unknown-route fallback. */ }
  }
  const todo = /^\/todo\/([^/]+)\/([^/]+)$/.exec(path);
  const item = /^\/(inbox|links\/(?:receipt|result|unsupported))\/([^/]+)(?:\/(target|resolve|search|supplement|multiple|no-place|delayed|ended))?$/.exec(path);
  if (item) {
    try {
      const pattern = `/${item[1]}/:id${item[3] ? `/${item[3]}` : ''}`;
      if (Object.hasOwn(ROUTES, pattern)) return { path: pattern, params: { id: decodeURIComponent(item[2]) } };
    } catch { /* Invalid encoded IDs follow the existing fallback. */ }
  }
  if (todo) {
    try { return { path: '/todo/:briefId/:screenId', todo: { briefId: decodeURIComponent(todo[1]), screenId: decodeURIComponent(todo[2]) } }; }
    catch { /* Invalid escapes use the same fallback as an unknown route. */ }
  }
  return { path: '/start', fallback: path !== '/start' };
}

export function renderRoute(state, hash) {
  const route = parseRoute(hash);
  if (!state.loggedIn && (['/map', '/verify', '/save-target', '/connected'].includes(route.path) || ['/copy/', '/place/', '/links/', '/inbox', '/appointments', '/settings'].some((prefix) => route.path.startsWith(prefix)))) return loginRequiredScreen();
  return ROUTES[route.path]({ ...state, ui: { ...state.ui, ...(route.path === '/map' ? { view: route.view } : {}), todo: route.todo, params: route.params } });
}
