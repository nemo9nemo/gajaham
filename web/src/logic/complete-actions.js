import { visibleMaps, switchMap } from './maps.js';
import { activePlaces } from './places.js';
import { findAccessiblePlace } from './place-edit.js';
import { parseIntakeUrl, submitIntake, intakeTargets, webIntakeTarget, findJob, jobTargetChoice, processIntake, changeJobTargets, resolveJob, supplementJob, keepJobLink, deleteJob, addJobPlace, confirmWaitingJob } from './intake.js';
import { appointmentFor, appointmentMap, chooseCandidate, removeCandidate, selectAppointment, visitAppointment, clearAppointment } from './appointments.js';
import { setDmDefault, exportRecords, leaveSharedMap } from './settings.js';
import { demoPlace, branchCandidates } from '../data/complete-demo.js';

const ui = (state, patch) => ({ ...state, ui: { ...state.ui, ...patch } });
const go = (state, route, patch = {}) => ui(state, { navigateTo: route, ...patch });
const jobPath = (id, suffix = '') => `#/inbox/${encodeURIComponent(id)}${suffix}`;
const resultPath = (id) => `#/links/result/${encodeURIComponent(id)}`;
const failed = (state, message = '접근 권한과 처리 상태를 확인해 주세요.') => ui(state, { notice: message });

export function demoSearchOptions(state, query = '') {
  const maps = visibleMaps(state);
  const candidates = [...branchCandidates(), ...maps.flatMap((map) => activePlaces(state, map.id).map((place) => ({ ...place, existingPlaceId: place.id })))];
  const seen = new Set();
  return candidates.filter((place) => {
    if (!`${place.name} ${place.region}`.toLocaleLowerCase('ko').includes(query.trim().toLocaleLowerCase('ko'))) return false;
    const key = place.placeKey ?? place.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function reduceCompleteAction(state, action, value) {
  if (!state.loggedIn) return state;
  const id = state.ui.params?.id ?? state.ui.activeJobId;
  switch (action) {
    case 'show-intake-map': {
      const job = findJob(state, id);
      const parts = job ? [job, ...(job.childIds ?? []).map((childId) => findJob(state, childId)).filter(Boolean)] : [];
      if (!parts.some((part) => part.results.some((result) => result.mapId === value && result.status === 'saved')) ||
          !visibleMaps(state).some((map) => map.id === value)) return state;
      return go(switchMap(state, value), '#/map', { sheet: null, selectedPlaceId: null, selectedIds: [], selectionMode: false,
        query: '', category: '전체', visit: '', senderId: '' });
    }
    case 'source-entry': {
      const place = findAccessiblePlace(state, state.ui.params?.id);
      const index = Number(value);
      const source = Number.isInteger(index) && index >= 0 && place?.sources[index];
      return source ? ui(state, { notice: `원본 링크: ${source.url ?? (index === 0 ? place.sourceUrl : '시연용 원본 링크 미제공')}` }) : state;
    }
    case 'job-verify-account': return findJob(state, value)?.stage === 'waiting'
      ? go(state, '#/verify', { verificationJobId: value }) : state;
    case 'confirm-intake': {
      if (state.ui.verificationJobId) {
        const result = confirmWaitingJob(state, state.ui.verificationJobId);
        return result.ok ? go(result.state, jobPath(result.job.id), { activeJobId: result.job.id, verificationJobId: null }) : failed(state);
      }
      if (!state.dmAccountVerified || !state.intakeLinks.length) return state;
      let next = state;
      let job;
      for (const url of state.intakeLinks) {
        const result = submitIntake(next, url, 'personal', { origin: 'dm', template: demoPlace() });
        if (!result.ok) return failed(state);
        next = result.state;
        job = result.job;
      }
      return go({ ...next, intakeLinks: [] }, jobPath(job.id), { activeJobId: job.id });
    }
    case 'link-start': return go({ ...state, intake: { ...state.intake, draft: { url: '', target: state.currentMapId } } }, '#/links/new');
    case 'link-url': return { ...state, intake: { ...state.intake, draft: { ...state.intake.draft, url: value } } };
    case 'link-target': return intakeTargets(state, value).length ? { ...state, intake: { ...state.intake,
      draft: { ...state.intake.draft, target: value } } } : state;
    case 'link-submit': {
      const draft = state.intake.draft;
      const result = submitIntake(state, draft.url, webIntakeTarget(state), { template: demoPlace() });
      return result.ok ? go(result.state, `#/links/${result.job.stage === 'unsupported' ? 'unsupported' : 'receipt'}/${result.job.id}`,
        { activeJobId: result.job.id }) : failed(state, result.reason === 'invalid-link' ? '게시물·릴스의 올바른 링크를 입력해 주세요.' : undefined);
    }
    case 'job-open': return findJob(state, value) ? go(state, jobPath(value), { activeJobId: value }) : state;
    case 'job-process': {
      const result = processIntake(state, id);
      return result.ok ? go(result.state, resultPath(id)) : failed(state, '확인이나 보완이 필요한 항목이에요. 장소를 먼저 확인해 주세요.');
    }
    case 'job-retry': {
      const result = processIntake(state, value);
      return result.ok ? go(result.state, resultPath(value), { activeJobId: value }) : failed(state);
    }
    case 'job-target-choice': return intakeTargets(state, value).length ? ui(state, { targetChoice: value, targetJobId: id, targetChoiceMapIds: intakeTargets(state, value) }) : state;
    case 'job-target-apply': {
      const job = findJob(state, id);
      if (!job) return state;
      const result = changeJobTargets(state, id, jobTargetChoice(state, job));
      return result.ok ? go(result.state, jobPath(id), { notice: '이 항목의 저장 대상을 바꿨어요' }) : failed(state);
    }
    case 'job-branch': return ui(state, { selectedBranch: value });
    case 'job-save-branch': {
      const template = branchCandidates()[Number(state.ui.selectedBranch)];
      if (state.ui.selectedBranch === null || !template) return failed(state, '지점을 먼저 골라 주세요.');
      const result = resolveJob(state, id, template);
      return result.ok ? go(result.state, resultPath(id)) : failed(state);
    }
    case 'job-search': return ui(state, { resolveQuery: value });
    case 'job-add-place': return findJob(state, id) ? go(state, jobPath(id, '/search'), { resolveMode: 'add', resolveQuery: '' }) : state;
    case 'job-find-place': return findJob(state, id) ? go(state, jobPath(id, '/search'), { resolveMode: 'resolve', resolveQuery: '' }) : state;
    case 'job-resolve': {
      const template = demoSearchOptions(state, state.ui.resolveQuery)[Number(value)];
      if (!template) return state;
      const result = state.ui.resolveMode === 'add' ? addJobPlace(state, id, template) : resolveJob(state, id, template, { manual: true });
      return result.ok ? go(result.state, state.ui.resolveMode === 'add' ? jobPath(id, '/multiple') : resultPath(id)) : failed(state);
    }
    case 'job-supplement': return supplementJob(state, id, { text: value });
    case 'job-capture': return ui(supplementJob(state, id, { capture: true }), { notice: '캡처 보완을 선택했어요. 이 목업은 파일을 업로드하지 않아요.' });
    case 'job-reanalyze': {
      const job = findJob(state, id);
      if (job?.primaryComplete || job?.stage === 'saved') return go(state,
        job.childIds?.length || job.unresolvedNames?.length ? jobPath(id, '/multiple') : resultPath(id),
        { notice: '이미 저장한 결과를 유지했어요.' });
      if (!job || (!job.supplement.trim() && !job.captureAdded)) return failed(state, '본문이나 캡처 보완을 먼저 추가해 주세요.');
      if (!parseIntakeUrl(job.sourceUrl)?.supported) return failed(state, '이 출처는 분석 미지원이에요. 장소를 직접 연결해 주세요.');
      const jobs = state.intake.jobs.map((item) => item.id === id ? { ...item, stage: 'processing', analysis: 'ready', template: demoPlace() } : item);
      return go({ ...state, intake: { ...state.intake, jobs } }, jobPath(id), { notice: '시연 데이터로 처리 결과를 확인할 수 있어요.' });
    }
    case 'job-keep': return findJob(state, id) ? go(keepJobLink(state, id), '#/inbox', { notice: '원본 링크를 처리함에 보관했어요' }) : state;
    case 'job-delete': return findJob(state, id) ? go(deleteJob(state, id), '#/inbox', { notice: '처리 항목을 삭제했어요. 저장된 장소는 유지돼요.' }) : state;
    case 'inbox-filter': return ['전체', '진행 중', '확인 필요', '완료'].includes(value) ? ui(state, { inboxFilter: value }) : state;
    case 'candidate-from-detail':
    case 'candidate-toggle': {
      const current = appointmentFor(state);
      if (current.candidateIds.includes(value)) return action === 'candidate-from-detail' ? go(state, '#/appointments/choose') : removeCandidate(state, value);
      const result = chooseCandidate(state, value);
      return result.ok ? (action === 'candidate-from-detail' ? go(result.state, '#/appointments/choose') : result.state)
        : result.reason === 'full' ? go(state, '#/appointments/replace', { pendingCandidateId: value, replacementId: null }) : failed(state);
    }
    case 'candidate-replace-choice': return appointmentFor(state).candidateIds.includes(value) ? ui(state, { replacementId: value }) : state;
    case 'candidate-replace': {
      const result = chooseCandidate(state, state.ui.pendingCandidateId, state.ui.replacementId);
      return result.ok ? go(result.state, '#/appointments/choose', { pendingCandidateId: null, replacementId: null }) : failed(state, '바꿀 후보를 골라 주세요.');
    }
    case 'appointment-select': {
      const next = selectAppointment(state, value);
      return next === state ? state : go(next, '#/appointments');
    }
    case 'appointment-visit': {
      const next = visitAppointment(state);
      return appointmentFor(next).chosenId ? go(next, '#/appointments/visited') : failed(state);
    }
    case 'appointment-reset': return appointmentMap(state) ? go(clearAppointment(state), '#/appointments/choose') : state;
    case 'appointment-copy-personal': {
      const personal = visibleMaps(state).find((map) => map.type === 'personal');
      return personal ? go(switchMap(state, personal.id), '#/copy/select', { copyPick: [] }) : state;
    }
    case 'dm-choice': return intakeTargets(state, value).length ? ui(state, {
      dmChoice: value === 'both' ? 'both' : visibleMaps(state).find((map) => map.id === value)?.type ?? value,
    }) : state;
    case 'dm-save': {
      const next = setDmDefault(state, state.ui.dmChoice);
      return next === state ? failed(state) : go(next, '#/settings', { notice: '이후 DM부터 적용돼요. 처리 중인 항목은 그대로예요.' });
    }
    case 'settings-map': return visibleMaps(state).some((map) => map.id === value) ? ui(state, { settingsMapId: value }) : state;
    case 'export-toggle': {
      if (!visibleMaps(state).some((map) => map.id === value)) return state;
      const ids = state.ui.exportMapIds ?? [];
      return ui(state, { exportMapIds: ids.includes(value) ? ids.filter((id) => id !== value) : [...ids, value], exportPreview: null });
    }
    case 'export-request': {
      const data = exportRecords(state, state.ui.exportMapIds ?? []);
      return data.maps.length ? ui(state, { exportPreview: data, notice: '내보낼 기본 기록을 확인했어요. 파일 형식은 아직 정해지지 않았어요.' }) : failed(state, '내보낼 맵을 골라 주세요.');
    }
    case 'leave-copy': {
      const map = appointmentMap(state);
      return map ? go(switchMap(state, map.id), '#/map?view=list', { view: 'list', selectionMode: true, selectedIds: [], sheet: null }) : state;
    }
    case 'leave-shared': {
      const map = appointmentMap(state);
      return map ? go(leaveSharedMap(state, map.id), '#/settings/ended') : state;
    }
    case 'account-policy': return ui(state, { policyNotice: value === 'account'
      ? '탈퇴 시 삭제 범위·공유 기록·보관 기간을 정한 뒤 제공할 예정이에요. 지금은 계정을 삭제하지 않아요.'
      : '삭제 범위와 복구 정책을 정한 뒤 제공할 예정이에요. 지금은 기록을 삭제하지 않아요.' });
    case 'dm-demo-submit': {
      const result = submitIntake(state, 'instagram.com/p/[시연용-DM]', state.dmDefaultTarget, { origin: 'dm', template: demoPlace() });
      return result.ok ? go(result.state, jobPath(result.job.id), { activeJobId: result.job.id }) : failed(state);
    }
    default: return state;
  }
}
