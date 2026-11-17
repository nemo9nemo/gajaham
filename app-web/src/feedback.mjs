export const errorCode = error => ['AbortError', 'TimeoutError', 'NetworkError'].includes(error?.name) ? 'unavailable' : String(error?.code ?? '').replace(/^auth\//, '');
export function errorMessage(error) {
  const code = errorCode(error);
  const reasons = {
    'rate-limited': '잠시 요청을 쉬어 주세요. 대기 시간이 지나면 남은 작업을 다시 시작할 수 있어요.',
    'record-limit': '보관할 수 있는 기록 수에 도달했어요. 휴지통의 기록을 영구 삭제한 뒤 다시 시도해 주세요.',
    'storage-limit': '보관 용량에 도달했어요. 긴 메모를 줄이거나 휴지통을 정리해 주세요.',
    'operation-limit': '누적 저장 요청 한도에 도달했어요. 잠시 기다려도 해제되지 않으니 문의 안내를 확인해 주세요.',
    'receipt-limit': '삭제 확인 요청이 많아요. 기존 요청 탭이나 문의 안내를 이용해 주세요.'
  };
  if (code === 'resource-exhausted') return reasons[error?.reason] ?? '보관 또는 요청 한도를 확인할 수 없어요. 작업을 멈췄으니 보관함과 연결 상태를 확인해 주세요.';
  if (code === 'aborted') return '다른 기기에서 기록이 변경됐어요. 입력한 내용과 최신 기록을 비교한 뒤 다시 저장해 주세요.';
  if (code === 'session-changed') return '계정이 바뀌었어요. 현재 계정에서 다시 시작해 주세요.';
  if (code === 'already-exists') return '이 요청은 다른 내용으로 처리됐어요. 기록을 확인한 뒤 새로 담기를 시작해 주세요.';
  if (code === 'weak-password') return '비밀번호는 영문 소문자와 숫자를 포함해 12~128자로 만들어 주세요.';
  if (code === 'mail-cooldown' || code === 'too-many-requests') return '메일이나 로그인 요청이 많아요. 잠시 뒤 다시 시도해 주세요.';
  if (code === 'failed-precondition') return '최근 인증이 필요하거나 기록 상태가 바뀌었어요. 새로 확인한 뒤 다시 시도해 주세요.';
  if (['unauthenticated', 'user-token-expired', 'invalid-user-token', 'user-disabled'].includes(code)) return '로그인 상태를 확인할 수 없어요. 다시 로그인해 주세요.';
  if (code === 'invalid-argument' || code === 'invalid-email') return '입력 길이와 이메일, 링크, 장소 정보를 확인해 주세요.';
  if (code === 'not-found') return '삭제됐거나 찾을 수 없는 기록이에요. 새로 불러와 주세요.';
  return '요청을 마치지 못했어요. 입력 정보와 연결 상태를 확인하고 다시 시도해 주세요.';
}
