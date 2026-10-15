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
  return {
    id, mapId, name, category, region, pin,
    locationStatus: pin ? 'confirmed' : 'unconfirmed',
    summary: '다시 찾아보고 싶은 장소를 소개한 게시물',
    visit: null, wantBy: [], hasImage: false,
    sourceUrl: 'instagram.com/reel/[시연용]', ...extra,
  };
}

export const PLACES = [
  place('pb-cafe', 'personal-b', '예시 카페 · 성수점', '카페', '서울 성동구', { x: 30, y: 28 }),
  place('pb-soup', 'personal-b', '예시 국밥집', '맛집', '서울 마포구', { x: 64, y: 51 }),
  place('pb-art', 'personal-b', '예시 전시 공간', '놀거리', '서울 종로구', { x: 35, y: 76 }),
  place('pb-bakery', 'personal-b', '예시 베이커리', '카페', '서울 성동구', null),
  place('pa-book', 'personal-a', '예시 개인 서점', '놀거리', '서울 종로구', { x: 35, y: 35 }),
  place('pa-tea', 'personal-a', '예시 개인 찻집', '카페', '서울 마포구', { x: 65, y: 65 }),
  place('shared-cafe', 'shared-ab', '예시 카페 · 성수점', '카페', '서울 성동구', { x: 30, y: 28 }, {
    summary: '테라스 분위기와 피스타치오 음료를 소개한 게시물',
    senderId: 'user-a', visit: 'want', wantBy: ['user-a'],
  }),
  place('shared-wine', 'shared-ab', '예시 와인바', '놀거리', '서울 용산구', { x: 63, y: 52 }, { senderId: 'user-a' }),
  place('shared-soup', 'shared-ab', '예시 국밥집', '맛집', '서울 마포구', { x: 36, y: 77 }, { senderId: 'user-b', visit: 'visited' }),
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
