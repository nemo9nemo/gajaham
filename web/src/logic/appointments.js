import { visibleMaps } from './maps.js';
import { findAccessiblePlace, toggleVisited } from './place-edit.js';

export function appointmentMap(state) {
  return state.loggedIn ? visibleMaps(state).find((map) => map.type === 'shared') ?? null : null;
}

export function appointmentFor(state) {
  const map = appointmentMap(state);
  const stored = state.appointments?.[map?.id] ?? { candidateIds: [], chosenId: null, selectedBy: null };
  const candidateIds = stored.candidateIds.filter((id) => {
    const place = findAccessiblePlace(state, id);
    return place?.mapId === map?.id;
  });
  return { ...stored, candidateIds, chosenId: candidateIds.includes(stored.chosenId) ? stored.chosenId : null };
}

function replaceAppointment(state, value) {
  const map = appointmentMap(state);
  return map ? { ...state, appointments: { ...state.appointments, [map.id]: value } } : state;
}

export function chooseCandidate(state, id, replaceId = null) {
  const map = appointmentMap(state);
  const place = findAccessiblePlace(state, id);
  if (!map || place?.mapId !== map.id) return { ok: false, reason: 'no-access', state };
  const current = appointmentFor(state);
  if (current.candidateIds.includes(id)) return { ok: true, state };
  let candidateIds = [...current.candidateIds];
  if (replaceId && candidateIds.includes(replaceId)) {
    candidateIds = candidateIds.map((value) => value === replaceId ? id : value);
  } else if (candidateIds.length >= 3) return { ok: false, reason: 'full', state };
  else candidateIds.push(id);
  return { ok: true, state: replaceAppointment(state, { ...current, candidateIds,
    chosenId: candidateIds.includes(current.chosenId) ? current.chosenId : null,
    ...(candidateIds.includes(current.chosenId) ? {} : { selectedBy: null, visitedBy: null, visitedAt: null }),
  }) };
}

export function removeCandidate(state, id) {
  if (!appointmentMap(state)) return state;
  const current = appointmentFor(state);
  return replaceAppointment(state, { ...current, candidateIds: current.candidateIds.filter((value) => value !== id),
    chosenId: current.chosenId === id ? null : current.chosenId,
    ...(current.chosenId === id ? { selectedBy: null, visitedBy: null, visitedAt: null } : {}),
  });
}

export function selectAppointment(state, id) {
  const current = appointmentFor(state);
  return appointmentMap(state) && current.candidateIds.includes(id)
    ? replaceAppointment(state, { ...current, chosenId: id, selectedBy: state.currentUserId,
      ...(current.chosenId === id ? {} : { visitedBy: null, visitedAt: null }) }) : state;
}

export function visitAppointment(state) {
  const chosenId = appointmentFor(state).chosenId;
  const place = chosenId && findAccessiblePlace(state, chosenId);
  if (!place) return state;
  return place.visit === 'visited' ? state : replaceAppointment(toggleVisited(state, chosenId), {
    ...appointmentFor(state), visitedBy: state.currentUserId, visitedAt: '[날짜]',
  });
}

export function clearAppointment(state) {
  return replaceAppointment(state, { candidateIds: [], chosenId: null, selectedBy: null });
}
