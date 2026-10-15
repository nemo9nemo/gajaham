export function matchesQuery(place, query = '') {
  const search = query.trim().toLocaleLowerCase('ko');
  return !search || [place.name, place.region].some((value) => value.toLocaleLowerCase('ko').includes(search));
}

export function filterPlaces(places, { category, query, visit, senderId } = {}) {
  return places.filter((place) =>
    (!category || category === '전체' || place.category === category) &&
    matchesQuery(place, query) && (!visit || place.visit === visit) &&
    (!senderId || place.senderId === senderId));
}

export const pinnable = (places) => places.filter((place) => place.locationStatus === 'confirmed' && place.pin);
export const unconfirmed = (places) => places.filter((place) => place.locationStatus === 'unconfirmed');
