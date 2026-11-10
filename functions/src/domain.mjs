export const CATEGORIES = Object.freeze({ food: '맛집', cafe: '카페', play: '놀거리', stay: '숙소', other: '기타' });
export const MAX_RECORDS = 5000;
export const MAX_CREATE_REQUESTS = 100000;
export const MAX_BYTES = 2 * 1024 * 1024;
export const TRASH_MS = 30 * 86400000;
export class DomainError extends Error {
  constructor(code, message, details) { super(message); this.code = code; this.details = details; }
}
export function fail(code, message, details) { throw new DomainError(code, message, details); }
export function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) fail('invalid-argument', '입력 항목을 확인해 주세요.');
  return value;
}
export function text(value, max, fallback = '') {
  const result = value === undefined ? fallback : value;
  if (typeof result !== 'string' || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(result)) fail('invalid-argument', '입력 길이와 내용을 확인해 주세요.');
  return result.normalize('NFC').trim();
}
export function normalizeUrl(value) {
  const raw = text(value, 2048);
  if (!raw) return { sourceUrl: '', canonicalSource: '' };
  let url; try { url = new URL(raw); } catch { fail('invalid-argument', '올바른 웹 링크를 입력해 주세요.'); }
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) fail('invalid-argument', 'http 또는 https 링크만 저장할 수 있어요.');
  const sourceUrl = url.href;
  const post = /^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{1,128})\/?$/.exec(url.pathname);
  const instagram = ['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(url.hostname.toLowerCase());
  const canonicalSource = instagram && !url.port && post
    ? `https://www.instagram.com/${post[1] === 'reels' ? 'reel' : post[1]}/${post[2]}/` : url.href;
  return { sourceUrl, canonicalSource };
}
export function normalizeInput(input) {
  object(input, ['sourceUrl', 'name', 'address', 'category', 'memo', 'menu', 'visited']);
  const urls = normalizeUrl(input.sourceUrl);
  const record = { ...urls, name: text(input.name, 120), address: text(input.address, 300), category: text(input.category, 20, 'other'), memo: text(input.memo, 2000), menu: text(input.menu, 500), visited: input.visited ?? false };
  if (!Object.hasOwn(CATEGORIES, record.category) || typeof record.visited !== 'boolean') fail('invalid-argument', '분류와 방문 상태를 확인해 주세요.');
  if (!record.sourceUrl && !(record.name && record.address)) fail('invalid-argument', '링크 또는 장소 이름과 주소를 입력해 주세요.');
  return record;
}
export function editableInput(input) { const { canonicalSource, ...fields } = normalizeInput(input); return fields; }
export function id(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) fail('invalid-argument', '요청을 다시 시작해 주세요.');
  return value;
}
export function revision(value) { if (!Number.isSafeInteger(value) || value < 1) fail('invalid-argument', '기록을 새로 불러와 주세요.'); return value; }
export function bytes(record) { return new TextEncoder().encode(JSON.stringify(record)).byteLength; }
export function escaped(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
export function publicRecord(record) {
  const { createFingerprint, lastFingerprint, ...result } = record;
  return result;
}
