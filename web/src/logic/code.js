export const CODE_STATUS = {
  available: { label: '사용 가능', description: '상대방이 입력할 수 있어요.' },
  expired: { label: '만료됨', description: '이 코드는 더 이상 쓸 수 없어요.' },
  cancelled: { label: '취소됨', description: '직접 취소한 코드예요.' },
  used: { label: '사용 완료', description: '이미 연결에 쓰인 코드예요. 공유 맵이 만들어졌어요.' },
  superseded: { label: '이전 코드 무효', description: '재발급해서 이전 코드는 쓸 수 없어요. 새 코드를 다시 전달해 주세요.' },
};

export const UNUSABLE_CODE_MESSAGE = '입력한 코드를 쓸 수 없어요(만료·취소·사용 완료). 상대방에게 새 코드를 요청해 주세요.';

export function issueCode(codes, ownerId, now) {
  const id = `mock-code-${ownerId}-${now}-${codes.length}`;
  return [
    ...codes.map((code) => code.ownerId === ownerId && code.status === 'available'
      ? { ...code, status: 'superseded' } : code),
    { id, value: id, ownerId, issuedAt: now, status: 'available' },
  ];
}

function changeStatus(codes, codeId, status) {
  return codes.map((code) => code.id === codeId && code.status === 'available' ? { ...code, status } : code);
}

export const cancelCode = (codes, codeId) => changeStatus(codes, codeId, 'cancelled');
export const expireCode = (codes, codeId) => changeStatus(codes, codeId, 'expired');

export function redeemCode(state, codeValue, userId) {
  if (!state.loggedIn || state.currentUserId !== userId) return { ok: false, reason: 'login-required' };
  const code = state.codes.find((item) => item.value === codeValue);
  if (!code) return { ok: false, reason: 'not-found' };
  if (code.status !== 'available') return { ok: false, reason: 'unusable', status: code.status };
  if (code.ownerId === userId) return { ok: false, reason: 'own-code' };
  const shared = state.maps.find((map) => map.type === 'shared' && map.active &&
    (map.memberIds.includes(userId) || map.memberIds.includes(code.ownerId)));
  if (shared) return { ok: false, reason: 'already-shared', sharedMapId: shared.id };
  const owner = state.users.find((user) => user.id === code.ownerId);
  if (!owner) return { ok: false, reason: 'not-found' };
  return { ok: true, owner };
}

// Returns the result and a new state; a failed confirmation preserves the input state.
export function confirmConnect(state, codeValue, userId) {
  const result = redeemCode(state, codeValue, userId);
  if (!result.ok) return { ...result, state };
  const code = state.codes.find((item) => item.value === codeValue);
  let mapId = `shared-${code.id}`;
  while (state.maps.some((map) => map.id === mapId)) mapId += '-new';
  const map = { id: mapId, name: '우리 공유 맵', type: 'shared', memberIds: [result.owner.id, userId], active: true };
  return {
    ok: true, sharedMapId: mapId,
    state: { ...state, maps: [...state.maps, map],
      codes: state.codes.map((item) => item.id === code.id ? { ...item, status: 'used' } : item) },
  };
}
