import { create } from 'zustand';

/**
 * Hotel search state — filters, sort, pagination, results.
 * Filters can be synced to/from URL via URLSearchParams.
 */
export const useHotelSearchStore = create((set, get) => ({
  /* ── Search params ─────────────────────────── */
  city:        '',
  checkIn:     '',
  checkOut:    '',
  rooms:       1,
  adults:      2,
  children:    0,

  /* ── Filters ───────────────────────────────── */
  priceMin:    500,
  priceMax:    25000,
  starRating:  [],          // [3, 4, 5]
  guestRating: 0,           // 0 = any, 6, 7, 8
  amenities:   [],          // ['WiFi', 'Pool', ...]
  propertyTypes: [],        // ['Hotel', 'Resort', ...]
  freeCancellation: false,

  /* ── Sort & pagination ─────────────────────── */
  sort:        'recommended', // recommended | price_asc | price_desc | rating | stars
  visibleCount: 20,           // infinite-scroll page size

  /* ── Results ───────────────────────────────── */
  source:      'mock',
  center:      { lat: 20.5937, lng: 78.9629, name: '' },
  allHotels:   [],
  loading:     false,
  error:       '',
  hoveredId:   null,
  selectedId:  null,

  /* ── Actions ───────────────────────────────── */
  setSearchParams: (p) => set((s) => ({ ...s, ...p, visibleCount: 20 })),
  setFilter:    (key, value) => set({ [key]: value, visibleCount: 20 }),
  toggleArrayFilter: (key, value) => set((s) => {
    const arr = s[key];
    return {
      [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      visibleCount: 20,
    };
  }),
  resetFilters: () => set({
    priceMin: 500, priceMax: 25000,
    starRating: [], guestRating: 0,
    amenities: [], propertyTypes: [],
    freeCancellation: false,
    sort: 'recommended', visibleCount: 20,
  }),
  setResults: ({ results, center, source }) => set({
    allHotels: results, center, source, error: '', visibleCount: 20,
  }),
  setLoading:  (loading) => set({ loading }),
  setError:    (error)   => set({ error }),
  setHoveredId:  (id) => set({ hoveredId: id }),
  setSelectedId: (id) => set({ selectedId: id }),
  loadMore:    () => set((s) => ({ visibleCount: s.visibleCount + 20 })),

  /* ── Derived: filtered + sorted hotels ─────── */
  getFilteredHotels: () => {
    const s = get();
    let list = s.allHotels.filter((h) => {
      if (h.price.amount < s.priceMin || h.price.amount > s.priceMax) return false;
      if (s.starRating.length && !s.starRating.includes(h.starRating))   return false;
      if (s.guestRating && h.rating.score < s.guestRating)               return false;
      if (s.amenities.length) {
        const has = (h.amenities || []);
        if (!s.amenities.every((a) => has.includes(a))) return false;
      }
      if (s.propertyTypes.length && !s.propertyTypes.includes(h.propertyType || 'Hotel')) return false;
      if (s.freeCancellation && !h.freeCancellation) return false;
      return true;
    });

    switch (s.sort) {
      case 'price_asc':  list = [...list].sort((a, b) => a.price.amount - b.price.amount); break;
      case 'price_desc': list = [...list].sort((a, b) => b.price.amount - a.price.amount); break;
      case 'rating':     list = [...list].sort((a, b) => b.rating.score - a.rating.score); break;
      case 'stars':      list = [...list].sort((a, b) => b.starRating - a.starRating);     break;
      default:
        // recommended = balance of rating + price (descending score)
        list = [...list].sort((a, b) => {
          const sa = a.rating.score - (a.price.amount / 5000);
          const sb = b.rating.score - (b.price.amount / 5000);
          return sb - sa;
        });
    }
    return list;
  },
}));

/* ─── URL <-> Store helpers ─────────────────────────────────────────────── */

export function paramsFromURL(searchParams) {
  const get = (k) => searchParams.get(k);
  const arr = (k) => (get(k) || '').split(',').filter(Boolean);
  return {
    city:     get('city')     || '',
    checkIn:  get('checkIn')  || '',
    checkOut: get('checkOut') || '',
    rooms:    Number(get('rooms')    || 1),
    adults:   Number(get('adults')   || 2),
    children: Number(get('children') || 0),
    priceMin: Number(get('priceMin') || 500),
    priceMax: Number(get('priceMax') || 25000),
    starRating:    arr('stars').map(Number).filter(Boolean),
    guestRating:   Number(get('guest') || 0),
    amenities:     arr('amenities'),
    propertyTypes: arr('types'),
    freeCancellation: get('freeCancel') === '1',
    sort: get('sort') || 'recommended',
  };
}

export function paramsToURL(state) {
  const sp = new URLSearchParams();
  if (state.city)     sp.set('city',     state.city);
  if (state.checkIn)  sp.set('checkIn',  state.checkIn);
  if (state.checkOut) sp.set('checkOut', state.checkOut);
  sp.set('rooms',  String(state.rooms));
  sp.set('adults', String(state.adults));
  if (state.children) sp.set('children', String(state.children));
  if (state.priceMin !== 500)   sp.set('priceMin', String(state.priceMin));
  if (state.priceMax !== 25000) sp.set('priceMax', String(state.priceMax));
  if (state.starRating.length)  sp.set('stars', state.starRating.join(','));
  if (state.guestRating)        sp.set('guest', String(state.guestRating));
  if (state.amenities.length)   sp.set('amenities', state.amenities.join(','));
  if (state.propertyTypes.length) sp.set('types', state.propertyTypes.join(','));
  if (state.freeCancellation)   sp.set('freeCancel', '1');
  if (state.sort !== 'recommended') sp.set('sort', state.sort);
  return sp.toString();
}
