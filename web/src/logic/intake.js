import { visibleMaps } from './maps.js';
import { findAccessiblePlace } from './place-edit.js';

export function parseIntakeUrl(value = '') {
  try {
    const text = String(value).trim();
    if (!text || /\s/.test(text)) return null;
    const parsed = new URL(text.includes('://') ? text : 'https:' + '//' + text);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname.includes('.')) return null;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/$/, '');
    const supported = host === 'instagram.com' && /^\/(p|reel)\/[^/]+$/.test(path);
    return { url: host + path + (supported ? '' : parsed.search + parsed.hash), originalUrl: text, supported };
  } catch { return null; }
}

export function intakeTargets(state, target, userId = state.currentUserId) {
  const maps = visibleMaps(state, userId);
  if (target === 'both') return maps.some((map) => map.type === 'shared') ? maps.map((map) => map.id) : [];
  if (target === 'personal' || target === 'shared') return maps.filter((map) => map.type === target).map((map) => map.id);
  return maps.some((map) => map.id === target) ? [target] : [];
}

export function webIntakeTarget(state) {
  const draft = state.intake?.draft?.target;
  if (intakeTargets(state, draft).length) return draft;
  const maps = visibleMaps(state);
  return maps.find((map) => map.id === state.currentMapId)?.id ?? maps.find((map) => map.type === 'personal')?.id;
}

export function ownedJobs(state, userId = state.currentUserId) {
  return state.loggedIn ? (state.intake?.jobs ?? []).filter((job) => job.ownerId === userId && !job.deleted) : [];
}

export function findJob(state, id, userId = state.currentUserId) {
  return state.loggedIn ? ownedJobs(state, userId).find((job) => job.id === id) ?? null : null;
}

export function jobTargetChoice(state, job) {
  const accessible = visibleMaps(state).map((map) => map.id);
  const explicit = state.ui.targetJobId === job.id &&
    JSON.stringify(state.ui.targetChoiceMapIds) === JSON.stringify(intakeTargets(state, state.ui.targetChoice));
  const choice = explicit ? state.ui.targetChoice : job.targetMapIds.every((id) => accessible.includes(id))
    ? job.targetMapIds.length > 1 ? 'both' : job.targetMapIds[0] : null;
  return intakeTargets(state, choice).length ? choice : visibleMaps(state).find((map) => map.type === 'personal')?.id;
}

function nextId(items, prefix) {
  let index = 1;
  while (items.some((item) => item.id === `${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function replaceJob(state, job) {
  let jobs = state.intake.jobs.map((item) => item.id === job.id ? job : item);
  jobs = jobs.map((item) => {
    if ((!item.unresolvedNames && !item.childIds) || (item.id !== job.id && item.id !== job.parentId)) return item;
    const complete = !item.unresolvedNames?.length && primarySaved(item) &&
      (item.childIds ?? []).every((id) => jobs.find((child) => child.id === id)?.stage === 'saved');
    return { ...item, stage: complete ? 'saved' : 'partial' };
  });
  return { ...state, intake: { ...state.intake, jobs } };
}

function primarySaved(job) {
  return job.primaryComplete || job.targetMapIds.length > 0 && job.targetMapIds.every((id) =>
    job.results.some((result) => result.mapId === id && result.status === 'saved'));
}

function makeJob(state, source, mapIds, { origin = 'web', template = null, analysis = 'ready' } = {}) {
  return {
    id: nextId(state.intake?.jobs ?? [], 'intake'), ownerId: state.currentUserId, sourceUrl: source.url, originalUrl: source.originalUrl,
    origin, requestedMapIds: [...mapIds], targetMapIds: [...mapIds], results: [],
    stage: source.supported ? 'processing' : 'unsupported', analysis: source.supported ? analysis : 'unsupported',
    template: template ? structuredClone(template) : null, deleted: false, supplement: '', captureAdded: false,
    receivedAt: '[접수 시각]',
  };
}

export function submitIntake(state, value, target, { origin = 'web', template = null, analysis = 'ready' } = {}) {
  if (!state.loggedIn) return { ok: false, reason: 'login', state };
  if (origin === 'dm' && !state.dmAccountVerified) return { ok: false, reason: 'verify-account', state };
  const source = parseIntakeUrl(value);
  const mapIds = intakeTargets(state, target);
  if (!source) return { ok: false, reason: 'invalid-link', state };
  if (!mapIds.length) return { ok: false, reason: 'no-access', state };
  const jobs = state.intake?.jobs ?? [];
  const job = makeJob(state, source, mapIds, { origin, template, analysis });
  return { ok: true, job, state: { ...state, intake: { ...state.intake, jobs: [...jobs, job] } } };
}

function stageFor(results) {
  const saved = results.filter((result) => result.status === 'saved').length;
  return saved === results.length && saved ? 'saved' : saved ? 'partial' : 'failed';
}

export function intakePlaceIdentity(place) {
  return place.intakePlaceIdentity ?? JSON.stringify([place.placeKey ?? null, place.name, place.category, place.region]);
}

export function changeJobTargets(state, id, target) {
  const job = findJob(state, id);
  const targets = intakeTargets(state, target);
  if (!job || !targets.length) return { ok: false, reason: 'no-access', state };
  if (job.stage === 'saved') return { ok: false, reason: 'already-saved', state };
  const retarget = (item) => {
    const results = item.results.filter((result) => result.status === 'saved' || targets.includes(result.mapId));
    const next = { ...item, targetMapIds: [...targets], results };
    return { ...next, primaryComplete: Boolean(item.primaryComplete) || primarySaved(next),
      stage: primarySaved(next) ? 'saved' : item.analysis === 'ready' ? 'processing' : item.stage };
  };
  let nextState = state;
  for (const childId of job.childIds ?? []) {
    const child = findJob(nextState, childId);
    if (child && child.stage !== 'saved') nextState = replaceJob(nextState, retarget(child));
  }
  nextState = replaceJob(nextState, retarget(job));
  return { ok: true, job: findJob(nextState, id), state: nextState };
}

export function processIntake(state, id) {
  const job = findJob(state, id);
  if (!job) return { ok: false, reason: 'no-access', state };
  if (job.primaryComplete) return { ok: true, job, state };
  if (job.manual && job.template?.existingPlaceId && !findAccessiblePlace(state, job.template.existingPlaceId)) {
    const results = [...job.results.filter((result) => result.status === 'saved'), ...job.targetMapIds
      .filter((mapId) => !job.results.some((result) => result.mapId === mapId && result.status === 'saved'))
      .map((mapId) => ({ mapId, status: 'failed', reason: 'needs-reselection' }))];
    const next = { ...job, results, template: null, analysis: 'no-place', reselectionRequired: true,
      stage: results.some((result) => result.status === 'saved') ? 'partial' : 'needs-place' };
    const nextState = replaceJob(state, next);
    return { ok: false, reason: 'needs-reselection', job: findJob(nextState, id), state: nextState };
  }
  if (job.analysis !== 'ready' || !job.template) return { ok: false, reason: 'needs-confirmation', state };
  if (!parseIntakeUrl(job.sourceUrl)?.supported && !job.manual) return { ok: false, reason: 'unsupported', state };
  let places = [...state.places];
  const results = [...job.results.filter((result) => result.status === 'saved' && !job.targetMapIds.includes(result.mapId)), ...job.targetMapIds.map((mapId) => {
    const previous = job.results.find((result) => result.mapId === mapId && result.status === 'saved');
    if (previous) return previous;
    if (!visibleMaps(state).some((map) => map.id === mapId)) return { mapId, status: 'failed', reason: 'access-ended' };
    if (state.mock?.intakeFailMapIds?.includes(mapId)) return { mapId, status: 'failed', reason: 'save-failed' };
    const source = job.template;
    const identity = intakePlaceIdentity(source);
    const sameLink = places.find((place) => place.mapId === mapId && !place.trashed &&
      (source.placeKey ? place.placeKey === source.placeKey : intakePlaceIdentity(place) === identity) &&
      [place.sourceUrl, ...place.sources.map((entry) => entry.url)].some((url) => url && parseIntakeUrl(url)?.url === job.sourceUrl));
    if (sameLink) return { mapId, status: 'saved', placeId: sameLink.id, outcome: 'unchanged' };
    const selectedPlace = job.manual && source.mapId === mapId ? places.find((place) =>
      place.mapId === mapId && !place.trashed && place.id === source.existingPlaceId) : null;
    const samePlace = selectedPlace ?? (source.placeKey && source.locationStatus === 'confirmed' ? places.find((place) =>
      place.mapId === mapId && !place.trashed && place.locationStatus === 'confirmed' && place.placeKey === source.placeKey) : null);
    const entry = { id: `source-${job.id}`, url: job.originalUrl ?? job.sourceUrl, kind: parseIntakeUrl(job.sourceUrl)?.supported ? (job.sourceUrl.includes('/reel/') ? '릴스' : '게시물') : '링크',
      senderId: job.ownerId, savedAt: '[저장 날짜]' };
    if (samePlace) {
      places = places.map((place) => place.id === samePlace.id ? { ...place,
        intakePlaceIdentity: intakePlaceIdentity(place),
        sources: [...place.sources, entry], history: [...place.history, { type: 'source-added', actorId: job.ownerId, at: '[날짜]' }],
      } : place);
      return { mapId, status: 'saved', placeId: samePlace.id, outcome: 'source-added' };
    }
    const placeId = nextId(places, 'saved-place');
    const fields = ['name', 'category', 'region', 'locationStatus', 'pin', 'placeKey', 'summary', 'menu', 'tip', 'hasImage'];
    const base = structuredClone(Object.fromEntries(fields.map((field) => [field, source[field]])));
    places.push({ ...base, id: placeId, mapId, sourceUrl: job.originalUrl ?? job.sourceUrl, sourceAccess: 'ok', sources: [entry],
      intakePlaceIdentity: identity,
      pin: source.locationStatus === 'confirmed' ? structuredClone(source.pin) : null,
      savedBy: job.ownerId, senderId: job.ownerId, copyOf: null, memo: null, photos: 0, visit: null, wantBy: [],
      inputOrigin: job.manual ? 'manual' : 'extracted',
      edits: {}, trashed: false, deletedBy: null, history: [{ type: 'saved', actorId: job.ownerId, at: '[날짜]' }],
    });
    return { mapId, status: 'saved', placeId, outcome: 'new' };
  })];
  const next = { ...job, results, stage: stageFor(results), primaryComplete: stageFor(results) === 'saved' };
  const nextState = replaceJob({ ...state, places }, next);
  return { ok: true, job: findJob(nextState, id), state: nextState };
}

export function resolveJob(state, id, template, { manual = null } = {}) {
  const job = findJob(state, id);
  if (!job || !template?.name?.trim()) return { ok: false, reason: 'needs-place', state };
  if (job.stage === 'saved' || job.primaryComplete) return { ok: false, reason: 'already-saved', state };
  const isManual = manual ?? job.analysis !== 'ambiguous';
  const existing = isManual ? findAccessiblePlace(state, template.id) : null;
  const existingPlaceId = existing?.mapId === template.mapId &&
    ['name', 'category', 'region', 'placeKey'].every((field) => existing[field] === template[field]) ? existing.id : null;
  const selected = isManual ? { ...structuredClone(template), menu: null, tip: null, hasImage: false,
    existingPlaceId,
    summary: '사용자가 직접 연결한 장소예요. 게시물 내용을 분석한 결과가 아니에요.' } : structuredClone(template);
  const prepared = replaceJob(state, { ...job, template: selected, manual: isManual, analysis: 'ready', stage: 'processing', reselectionRequired: false });
  return processIntake(prepared, id);
}

export function supplementJob(state, id, patch) {
  const job = findJob(state, id);
  if (!job || job.stage === 'saved' || job.primaryComplete) return state;
  return replaceJob(state, { ...job,
    supplement: typeof patch.text === 'string' ? patch.text : job.supplement,
    captureAdded: patch.capture === true || job.captureAdded,
  });
}

export function keepJobLink(state, id) {
  const job = findJob(state, id);
  return job && ![job, ...(job.childIds ?? []).map((childId) => findJob(state, childId)).filter(Boolean)]
    .some((part) => part.results.some((result) => result.status === 'saved'))
    ? replaceJob(state, { ...job, stage: 'link-only' }) : state;
}

export function deleteJob(state, id) {
  const job = findJob(state, id);
  if (!job) return state;
  const root = findJob(state, job.parentId ?? job.id);
  const ids = new Set([root.id, ...(root.childIds ?? [])]);
  return { ...state, intake: { ...state.intake, jobs: state.intake.jobs.map((item) => ids.has(item.id) ? { ...item, deleted: true } : item) } };
}

export function addJobPlace(state, id, template) {
  const job = findJob(state, id);
  if (!job || !job.unresolvedNames?.length) return { ok: false, reason: 'no-pending-place', state };
  const child = { ...makeJob(state, parseIntakeUrl(job.originalUrl ?? job.sourceUrl), job.targetMapIds, { template, origin: job.origin }), parentId: job.id };
  const grouped = { ...state, intake: { ...state.intake, jobs: [...state.intake.jobs, child] } };
  const processed = resolveJob(grouped, child.id, template, { manual: true });
  if (!processed.ok) return processed;
  const unresolvedNames = job.unresolvedNames.slice(1);
  const parent = { ...job, childIds: [...(job.childIds ?? []), child.id], unresolvedNames,
    stage: unresolvedNames.length || processed.job.stage !== 'saved' ? 'partial' : 'saved' };
  const nextState = replaceJob(processed.state, parent);
  return { ok: true, job: findJob(nextState, id), state: nextState };
}

export function confirmWaitingJob(state, id) {
  const job = findJob(state, id);
  if (!state.dmAccountVerified || job?.stage !== 'waiting') return { ok: false, state };
  const next = { ...job, stage: 'processing', analysis: 'ready' };
  return { ok: true, job: next, state: replaceJob(state, next) };
}
