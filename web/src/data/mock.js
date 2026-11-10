export const USERS = [
  { id: 'user-a', name: '사용자 A', initial: 'A' },
  { id: 'user-b', name: '사용자 B', initial: 'B' },
];

export const MAPS = [
  { id: 'personal-a', type: 'personal', name: '내 개인 맵', ownerId: 'user-a' },
  { id: 'personal-b', type: 'personal', name: '내 개인 맵', ownerId: 'user-b' },
  { id: 'shared-ab', type: 'shared', name: '우리 공유 맵', memberIds: ['user-a', 'user-b'], active: true },
];

function place(id, mapId, name, category, region, pin, extra = {}) {
  const savedBy = mapId === 'personal-a' ? 'user-a' : mapId === 'personal-b' ? 'user-b' : extra.senderId;
  const keys = {
    'pb-cafe': 'seongsu-cafe', 'shared-cafe': 'seongsu-cafe',
    'pb-soup': 'mapo-gukbap', 'shared-soup': 'mapo-gukbap', 'pb-art': 'jongno-art',
    'shared-wine': 'yongsan-wine', 'pa-book': 'jongno-book', 'pa-tea': 'mapo-tea',
  };
  return {
    id, mapId, name, category, region, pin,
    locationStatus: pin ? 'confirmed' : 'unconfirmed',
    summary: '다시 찾아보고 싶은 장소를 소개한 게시물',
    visit: null, wantBy: [], hasImage: false,
    sourceUrl: 'instagram.com/reel/[시연용]',
    placeKey: keys[id] ?? null, savedBy, menu: null, tip: null, memo: null, photos: 0,
    sources: [{ id: `src-${id}`, kind: '게시물', senderId: savedBy, savedAt: '[저장 날짜]' }],
    sourceAccess: 'ok', edits: {}, history: [{ type: 'saved', actorId: savedBy, at: '[날짜]' }],
    copyOf: null, trashed: false, deletedBy: null,
    ...extra,
  };
}

const cafePost = { id: 'src-cafe-post', kind: '게시물', senderId: 'user-a', savedAt: '[저장 날짜]', postedAt: '[확보한 경우]', fetchedAt: '[시각]', basis: '캡션의 추천 표현' };
const cafeReel = { id: 'src-cafe-reel', kind: '릴스', senderId: 'user-b', savedAt: '[저장 날짜]', menuNote: '언급 메뉴: 바스크 치즈케이크 · 추천 근거 없음' };

export const PLACES = [
  place('pb-cafe', 'personal-b', '예시 카페 · 성수점', '카페', '서울 성동구', { x: 30, y: 28 }, {
    memo: { text: '테라스 자리 먼저 보기', authorId: 'user-b' }, photos: 1, visit: 'visited', sources: [cafeReel],
  }),
  place('pb-soup', 'personal-b', '예시 국밥집', '맛집', '서울 마포구', { x: 64, y: 51 }),
  place('pb-art', 'personal-b', '예시 전시 공간', '놀거리', '서울 종로구', { x: 35, y: 76 }),
  place('pb-bakery', 'personal-b', '예시 베이커리', '카페', '서울 성동구', null, {
    summary: '크루아상을 소개한 게시물', menu: { name: '크루아상', kind: 'mentioned' },
    memo: { text: '오전에 가기', authorId: 'user-b' }, sourceAccess: 'unavailable',
  }),
  place('pa-book', 'personal-a', '예시 개인 서점', '놀거리', '서울 종로구', { x: 35, y: 35 }),
  place('pa-tea', 'personal-a', '예시 개인 찻집', '카페', '서울 마포구', { x: 65, y: 65 }),
  place('shared-cafe', 'shared-ab', '예시 카페 · 성수점', '카페', '서울 성동구', { x: 30, y: 28 }, {
    summary: '테라스 분위기와 피스타치오 음료를 소개한 게시물',
    senderId: 'user-a', visit: 'want', wantBy: ['user-a'],
    menu: { name: '피스타치오 라테', kind: 'recommended', basis: '원문 추천 표현 확인' },
    tip: '주말 대기 언급', memo: { text: '서울숲 산책하고 가기', authorId: 'user-a' }, photos: 1,
    sources: [cafePost, cafeReel], edits: { category: 'user-b' },
    history: [{ type: 'saved', actorId: 'user-a', at: '[날짜]' },
      { type: 'edited', field: '카테고리', actorId: 'user-b', at: '[날짜]' },
      { type: 'copied', actorId: 'user-b', originalSaverId: 'user-b', at: '[날짜]' }],
  }),
  place('shared-wine', 'shared-ab', '예시 와인바', '놀거리', '서울 용산구', { x: 63, y: 52 }, { senderId: 'user-a' }),
  place('shared-soup', 'shared-ab', '예시 국밥집', '맛집', '서울 마포구', { x: 36, y: 77 }, {
    senderId: 'user-b', visit: 'visited', edits: { category: 'user-a' },
    history: [{ type: 'copied', actorId: 'user-b', originalSaverId: 'user-b', at: '[날짜]' },
      { type: 'edited', field: '카테고리', actorId: 'user-a', at: '[날짜]' }],
  }),
  place('shared-bakery', 'shared-ab', '예시 베이커리', '카페', '서울 성동구', null, { senderId: 'user-b' }),
];

export const MOCK_CODE = {
  id: 'code-a', value: '[연결 코드]', ownerId: 'user-a', status: 'available', issuedAt: 0,
};

export function userName(state, userId) {
  return state.users.find((user) => user.id === userId)?.name ?? '';
}

export function userInitial(state, userId) {
  return state.users.find((user) => user.id === userId)?.initial ?? '';
}
