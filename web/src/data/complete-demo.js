import { PLACES } from './mock.js';
import { submitIntake, processIntake } from '../logic/intake.js';
import { chooseCandidate, selectAppointment, visitAppointment } from '../logic/appointments.js';
import { leaveSharedMap } from '../logic/settings.js';

export const COMPLETE_SCENARIOS = [
  'link-solo', 'link-shared', 'link-received', 'link-saved', 'link-partial', 'link-unsupported', 'link-duplicate',
  'inbox-demo', 'inbox-target', 'inbox-ambiguous', 'inbox-unreadable', 'inbox-multiple', 'inbox-no-place', 'inbox-delayed', 'inbox-ended',
  'appointment-empty', 'appointment-choose', 'appointment-compare', 'appointment-full', 'appointment-final', 'appointment-visited',
  'settings-home', 'settings-default', 'settings-export', 'settings-trash', 'settings-leave', 'settings-ended', 'settings-account',
];

export function demoPlace(kind = 'cafe') {
  const id = { cafe: 'shared-cafe', soup: 'pb-soup', bakery: 'pb-bakery', wine: 'shared-wine', art: 'pb-art' }[kind] ?? 'shared-cafe';
  return structuredClone(PLACES.find((place) => place.id === id));
}

export function branchCandidates() {
  return ['연남점', '합정점'].map((branch, index) => ({ ...demoPlace('soup'), name: `예시 파스타 · ${branch}`,
    category: '맛집', region: '서울 마포구', placeKey: `demo-pasta-${index}`, pin: { x: 40 + index * 10, y: 55 },
    difference: index ? '가게 이름만 일치' : '게시물 위치 태그의 동네 이름과 일치', menu: null,
  }));
}

function addJob(state, kind, target = 'personal-b') {
  const analysis = { ambiguous: 'ambiguous', unreadable: 'unreadable', 'no-place': 'no-place', delayed: 'delayed', waiting: 'waiting' }[kind] ?? 'ready';
  const url = kind === 'unsupported' ? 'blog.example/[시연용]' : kind === 'duplicate'
    ? demoPlace().sourceUrl : `instagram.com/p/[시연용-${kind}]`;
  const submitted = submitIntake(state, url, target, { origin: kind === 'waiting' ? 'dm' : 'web',
    analysis, template: demoPlace(kind === 'multiple' || kind === 'partial' ? 'soup' : 'cafe'),
  });
  state = submitted.state;
  let job = state.intake.jobs.at(-1);
  const stage = { ambiguous: 'needs-confirmation', unreadable: 'failed', retryable: 'failed', 'no-place': 'needs-place', delayed: 'processing', waiting: 'waiting' }[kind];
  if (stage) {
    job = { ...job, stage };
    state = { ...state, intake: { ...state.intake, jobs: state.intake.jobs.map((item) => item.id === job.id ? job : item) } };
  }
  if (['saved', 'partial', 'duplicate', 'multiple'].includes(kind)) {
    if (kind === 'partial') state.mock = { ...state.mock, intakeFailMapIds: ['shared-ab'] };
    state = processIntake(state, job.id).state;
    state.mock = { ...state.mock, intakeFailMapIds: [] };
  }
  if (kind === 'multiple') Object.assign(state.intake.jobs.find((item) => item.id === job.id), {
    stage: 'partial', unresolvedNames: ['언급된 장소 2', '언급된 장소 3'],
  });
  return { ...state, ui: { ...state.ui, activeJobId: job.id } };
}

export function completeDemo(state, key) {
  state = { ...state, intake: { jobs: [], draft: { url: '', target: state.currentMapId } }, appointments: {},
    ui: { ...state.ui, activeJobId: null, inboxFilter: '전체', targetChoice: state.currentMapId, resolveQuery: '',
      selectedBranch: null, replacementId: null, pendingCandidateId: null, dmChoice: state.dmDefaultTarget,
      settingsMapId: state.currentMapId, exportMapIds: [state.currentMapId],
    },
  };
  if (!COMPLETE_SCENARIOS.includes(key)) return state;
  if (key.startsWith('link-')) {
    state.intake.draft.url = 'instagram.com/p/[시연용]';
    if (['link-solo', 'link-shared'].includes(key)) return state;
    const kind = key.slice(5);
    return addJob(state, kind === 'received' ? 'ready' : kind, kind === 'partial' ? 'both' : 'shared-ab');
  }
  if (key.startsWith('inbox-')) {
    const kind = key.slice(6);
    if (kind === 'demo') {
      for (const value of ['waiting', 'ready', 'ambiguous', 'multiple', 'unreadable', 'saved']) state = addJob(state, value, value === 'saved' ? 'both' : 'personal-b');
      return state;
    }
    state = addJob(state, kind === 'target' ? 'ready' : kind === 'ended' ? 'partial' : kind, kind === 'ended' ? 'both' : 'shared-ab');
    if (kind === 'delayed') {
      const delayedId = state.ui.activeJobId;
      state = addJob(state, 'retryable', 'personal-b');
      state.ui = { ...state.ui, retryJobId: state.ui.activeJobId, activeJobId: delayedId };
    }
    if (kind === 'ended') state = leaveSharedMap(state, 'shared-ab');
    return state;
  }
  if (key.startsWith('appointment-')) {
    state.places = state.places.map((place) => place.id === 'shared-cafe' ? { ...place, wantBy: ['user-a', 'user-b'] }
      : place.id === 'shared-wine' ? { ...place, wantBy: ['user-a'], menu: { name: '하우스 와인', kind: 'mentioned' },
        memo: { text: '비 오는 날 가기', authorId: 'user-a' } } : place);
    state.places.push({ ...branchCandidates()[0], id: 'shared-pasta', mapId: 'shared-ab', savedBy: 'user-b', senderId: 'user-b',
      sources: [{ id: 'src-pasta', kind: '게시물', senderId: 'user-b', savedAt: '[저장 날짜]' }], wantBy: ['user-b'] });
    if (key === 'appointment-empty') return state;
    for (const id of ['shared-cafe', 'shared-wine']) state = chooseCandidate(state, id).state;
    if (['appointment-compare', 'appointment-full', 'appointment-final', 'appointment-visited'].includes(key)) state = chooseCandidate(state, 'shared-pasta').state;
    if (key === 'appointment-full') state.ui = { ...state.ui, pendingCandidateId: 'shared-soup', replacementId: 'shared-wine' };
    if (['appointment-final', 'appointment-visited'].includes(key)) state = selectAppointment(state, 'shared-cafe');
    if (key === 'appointment-visited') state = visitAppointment(state);
    return state;
  }
  if (key === 'settings-trash') {
    state.places = state.places.map((place) => ['shared-soup', 'shared-wine'].includes(place.id)
      ? { ...place, trashed: true, deletedBy: 'user-b' } : place);
  }
  if (key === 'settings-ended') state = leaveSharedMap({ ...state, dmDefaultTarget: 'both' }, 'shared-ab');
  return state;
}
