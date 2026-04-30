/**
 * Hotel affiliate search routes
 * - Uses BookingComClient when key is configured
 * - Falls back to deterministic mock data with realistic coords for map
 * - Applies effective margin (end-user or corporate-specific) to all prices
 *
 * GET /api/hotels/affiliate-search?city=Mumbai&checkIn=2026-05-01&checkOut=2026-05-04&rooms=1&adults=2
 */
import { Router, Request, Response } from 'express';
import { bookingCom, BookingComError, HotelResult } from '../lib/api/booking-com';
import { getEffectiveMargin, calculatePriceWithMargin, saveLivePrice } from '../utils/settingsCache';

const router = Router();

/* ─── City coordinate seed (for mock + map default center) ──────────────── */
const CITY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  mumbai:    { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
  delhi:     { lat: 28.6139, lng: 77.2090, name: 'Delhi' },
  bangalore: { lat: 12.9716, lng: 77.5946, name: 'Bangalore' },
  goa:       { lat: 15.2993, lng: 74.1240, name: 'Goa' },
  jaipur:    { lat: 26.9124, lng: 75.7873, name: 'Jaipur' },
  kolkata:   { lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
  chennai:   { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
  hyderabad: { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
  pune:      { lat: 18.5204, lng: 73.8567, name: 'Pune' },
  agra:      { lat: 27.1767, lng: 78.0081, name: 'Agra' },
  udaipur:   { lat: 24.5854, lng: 73.7125, name: 'Udaipur' },
  manali:    { lat: 32.2432, lng: 77.1892, name: 'Manali' },
  shimla:    { lat: 31.1048, lng: 77.1734, name: 'Shimla' },
  varanasi:  { lat: 25.3176, lng: 82.9739, name: 'Varanasi' },
  kochi:     { lat: 9.9312,  lng: 76.2673, name: 'Kochi' },
};

const HOTEL_NAMES = [
  'The Oberoi', 'Taj Palace', 'Leela Grand', 'Hyatt Regency', 'JW Marriott',
  'Radisson Blu', 'Novotel', 'ITC Royal', 'Holiday Inn Express', 'Lemon Tree Premier',
  'Ginger Hotel', 'Treebo Trend', 'OYO Townhouse', 'FabHotel Prime', 'Sterling Resort',
  'Country Inn', 'Ramada Plaza', 'Park Plaza', 'Crowne Plaza', 'Fortune Park',
];

const PHOTO_POOL = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
  'https://images.unsplash.com/photo-1551776235-dde6d482980b?w=800',
];

const AMENITIES_POOL = ['WiFi', 'Pool', 'Parking', 'Gym', 'Spa', 'Restaurant', 'Bar', 'AC', 'Breakfast', 'Pet Friendly'];

const PROPERTY_TYPES = ['Hotel', 'Resort', 'Apartment', 'Hostel'];

/** Deterministic pseudo-random based on seed */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function buildMockHotels(city: string, count = 40): HotelResult[] {
  const key = city.toLowerCase().trim();
  const center = CITY_COORDS[key] || { lat: 20.5937, lng: 78.9629, name: city };
  const rand = seeded(key.split('').reduce((s, c) => s + c.charCodeAt(0), 0));

  const results: HotelResult[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand();
    const dLat = (rand() - 0.5) * 0.12; // ~6km radius
    const dLng = (rand() - 0.5) * 0.12;
    const stars = 3 + Math.floor(rand() * 3); // 3..5
    const score = +(6 + rand() * 4).toFixed(1); // 6.0..10.0
    const reviews = 50 + Math.floor(rand() * 4000);
    const basePrice = 1500 + Math.floor(rand() * 18500); // ₹1500..20000
    const photos = Array.from({ length: 3 + Math.floor(rand() * 3) }, () =>
      PHOTO_POOL[Math.floor(rand() * PHOTO_POOL.length)]);
    const amenityCount = 4 + Math.floor(rand() * 5);
    const amenities = [...AMENITIES_POOL].sort(() => rand() - 0.5).slice(0, amenityCount);

    const namePart = HOTEL_NAMES[Math.floor(rand() * HOTEL_NAMES.length)];
    const propertyType = PROPERTY_TYPES[Math.floor(rand() * PROPERTY_TYPES.length)];

    results.push({
      id: `mock-${key}-${i}`,
      name: `${namePart} ${center.name}`,
      starRating: stars,
      address: `${100 + i} ${['MG Road','Park Street','Marine Drive','Linking Road','Brigade Road'][i % 5]}, ${center.name}`,
      city: center.name,
      latitude: center.lat + dLat,
      longitude: center.lng + dLng,
      photos,
      price: { amount: basePrice, currency: 'INR', perNight: true },
      rating: { score, reviewCount: reviews },
      bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(center.name)}`,
      // extra fields for filters
      ...({
        propertyType,
        amenities,
        freeCancellation: rand() > 0.4,
      } as any),
    });
    void r;
  }
  return results;
}

/* ─── Detail (rich) helpers ─────────────────────────────────────────────── */
const ROOM_TYPES   = ['Deluxe King', 'Superior Twin', 'Family Suite', 'Executive Suite', 'Standard Double'];
const BED_CONFIGS  = ['1 King Bed', '2 Twin Beds', '1 Queen + Sofa', '2 Queen Beds', '1 King + Sofa'];
const AMENITY_GROUPS = {
  General:    ['Free WiFi', 'Air conditioning', '24-hour front desk', 'Lift', 'Daily housekeeping', 'Concierge'],
  Room:       ['Flat-screen TV', 'Mini-bar', 'Coffee/Tea maker', 'Safe', 'Hairdryer', 'Iron & ironing board'],
  Activities: ['Swimming pool', 'Fitness centre', 'Spa', 'Yoga classes', 'Bike rental'],
  Food:       ['Restaurant', 'Bar', 'Breakfast included', 'Room service', 'Special dietary menus'],
  Services:   ['Airport shuttle', 'Laundry', 'Dry cleaning', 'Babysitting', 'Currency exchange'],
};
const REVIEW_AUTHORS = ['Aarav S.', 'Priya M.', 'Rahul V.', 'Anika G.', 'Vikram J.', 'Neha P.', 'Karan R.', 'Sneha L.', 'Amit T.', 'Pooja K.'];
const REVIEW_TEXTS = [
  'Beautiful property with excellent service. Staff went out of their way to help.',
  'Clean rooms, comfortable beds and superb breakfast. Will return.',
  'Great location, walking distance to most attractions. Loved the rooftop pool.',
  'Value for money. Spacious rooms, friendly staff, decent food.',
  'A bit noisy at night but the views are worth it. Beds were heavenly.',
  'Top-notch service, attentive staff, and amazing buffet breakfast.',
  'Lovely experience. The spa was a highlight. Highly recommended.',
  'Rooms looked exactly like the photos. Quiet and peaceful neighbourhood.',
  'Perfect for a weekend getaway. Pool was clean, food was tasty.',
  'Outstanding hospitality. Concierge helped us plan a great itinerary.',
];

function buildHotelDetail(id: string) {
  // id format: mock-<city>-<idx>
  const parts = id.split('-');
  if (parts.length < 3 || parts[0] !== 'mock') return null;
  const cityKey = parts.slice(1, -1).join('-');
  const idx     = Number(parts[parts.length - 1]);
  const list    = buildMockHotels(cityKey, Math.max(idx + 1, 40));
  const base    = list[idx];
  if (!base) return null;

  const rand = seeded(id.split('').reduce((s, c) => s + c.charCodeAt(0), 0));

  const rooms = ROOM_TYPES.slice(0, 3 + Math.floor(rand() * 3)).map((rt, i) => ({
    id:            `${id}-room-${i}`,
    name:          rt,
    bedConfig:     BED_CONFIGS[i % BED_CONFIGS.length],
    sleeps:        2 + (i % 3),
    amenities:     ['Free WiFi', 'AC', 'Flat-screen TV', i % 2 === 0 ? 'City view' : 'Garden view'],
    pricePerNight: Math.round(base.price.amount * (0.85 + i * 0.15 + rand() * 0.1)),
    refundable:    rand() > 0.4,
  }));

  // 30 reviews; pagination by frontend
  const reviews = Array.from({ length: 30 }, (_, i) => ({
    id:     `${id}-rev-${i}`,
    author: REVIEW_AUTHORS[i % REVIEW_AUTHORS.length],
    score:  +(6 + rand() * 4).toFixed(1),
    date:   new Date(Date.now() - i * 86400000 * 5).toISOString().split('T')[0],
    text:   REVIEW_TEXTS[Math.floor(rand() * REVIEW_TEXTS.length)],
  }));

  const ratingBreakdown = {
    Cleanliness: +(7 + rand() * 3).toFixed(1),
    Staff:       +(7 + rand() * 3).toFixed(1),
    Comfort:     +(7 + rand() * 3).toFixed(1),
    'Value for money': +(7 + rand() * 3).toFixed(1),
    Location:    +(7 + rand() * 3).toFixed(1),
    Facilities:  +(7 + rand() * 3).toFixed(1),
  };

  const nearbyAttractions = [
    { name: `${base.city} City Centre`,    distanceKm: +(0.5 + rand() * 2).toFixed(1) },
    { name: `${base.city} Railway Station`,distanceKm: +(1 + rand() * 4).toFixed(1) },
    { name: `${base.city} Airport`,        distanceKm: +(8 + rand() * 12).toFixed(1) },
    { name: `Local Market`,                distanceKm: +(0.3 + rand() * 1.5).toFixed(1) },
    { name: `Popular Beach / Park`,        distanceKm: +(1 + rand() * 5).toFixed(1) },
  ];

  return {
    ...base,
    description: `Welcome to ${base.name}, a ${base.starRating}-star property nestled in the heart of ${base.city}. ` +
      `Our property combines modern amenities with traditional hospitality, offering guests an unforgettable stay. ` +
      `Whether you're travelling for business or leisure, our spacious rooms, world-class facilities, and dedicated staff ` +
      `ensure your visit is as comfortable as it is memorable. Enjoy our award-winning restaurant, rejuvenating spa, ` +
      `and rooftop pool — all designed with your comfort in mind. ` +
      `Located minutes from the city's best attractions, ${base.name} is the perfect base for exploring ${base.city}.`,
    checkInTime:  '14:00',
    checkOutTime: '11:00',
    amenityGroups: AMENITY_GROUPS,
    rooms,
    reviews,
    ratingBreakdown,
    nearbyAttractions,
    policies: {
      cancellation: 'Free cancellation up to 48 hours before check-in. Cancellations within 48 hours forfeit the first night.',
      payment:      'Visa, Mastercard, Amex, UPI, and bank transfer accepted. A valid government ID is required at check-in.',
      children:     'Children of all ages are welcome. Up to 2 children under 6 stay free using existing bedding. Extra bed available on request (₹1500/night).',
      pets:         'Pets are not allowed.',
    },
  };
}

/* ─── GET /api/hotels/affiliate/:id ─────────────────────────────────────── */
router.get('/affiliate/:id', async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const detail = buildHotelDetail(id);
  if (!detail) {
    res.status(404).json({ message: 'Hotel not found' });
    return;
  }

  // Get effective margin based on user (corporate or end-user)
  const userId = (req as any).user?.id;
  const margin = await getEffectiveMargin(userId, 'hotel');

  // Apply margin to room prices
  const marginedDetail = {
    ...detail,
    rooms: detail.rooms.map((room: any) => {
      const actualPrice = room.pricePerNight;
      const { finalPrice, marginApplied } = calculatePriceWithMargin(actualPrice, margin);
      return {
        ...room,
        actualPrice,
        pricePerNight: finalPrice,
        marginApplied,
      };
    }),
    marginType: margin.type,
    marginMethod: margin.method,
  };

  res.json(marginedDetail);
});

/* ─── GET /api/hotels/affiliate-search ──────────────────────────────────── */
router.get('/affiliate-search', async (req: Request, res: Response): Promise<void> => {
  const {
    city,
    checkIn,
    checkOut,
    rooms = '1',
    adults = '2',
    children = '0',
  } = req.query as Record<string, string>;

  if (!city || !checkIn || !checkOut) {
    res.status(400).json({ message: 'city, checkIn, checkOut are required' });
    return;
  }

  // Get effective margin based on user (corporate or end-user)
  const userId = (req as any).user?.id;
  const margin = await getEffectiveMargin(userId, 'hotel');

  const searchParams = {
    city,
    checkIn,
    checkOut,
    rooms: Number(rooms),
    adults: Number(adults),
    children: Number(children),
  };

  let source: 'live' | 'mock' = 'mock';
  let results: HotelResult[] = [];

  if (bookingCom.hasKey()) {
    try {
      results = await bookingCom.searchHotels(searchParams);
      source = 'live';
    } catch (err) {
      const msg = err instanceof BookingComError ? `${err.code}: ${err.message}` : String(err);
      console.warn('[affiliate-search] live failed → mock fallback:', msg);
      results = buildMockHotels(city, 40);
    }
  } else {
    results = buildMockHotels(city, 40);
  }

  // Apply margin to all prices and save actual prices for live results
  const marginedResults = await Promise.all(results.map(async (hotel) => {
    const actualPrice = hotel.price.amount;
    const { finalPrice, marginApplied } = calculatePriceWithMargin(actualPrice, margin);

    // Save actual price to LivePrice table for live API results
    if (source === 'live') {
      saveLivePrice({
        type: 'hotel',
        externalId: hotel.id,
        source: 'bookingcom',
        searchParams,
        actualPrice,
        marginPercent: margin.method === 'percent' ? margin.percent : 0,
        currency: hotel.price.currency || 'INR',
        ttlMinutes: 60,
      }).catch(err => console.error('Failed to save live price:', err));
    }

    return {
      ...hotel,
      price: {
        ...hotel.price,
        amount: finalPrice,
        actualAmount: actualPrice, // Include actual price for reference
        marginApplied, // How much margin was added
      },
      marginType: margin.type, // 'endUser' or 'corporate'
      marginMethod: margin.method, // 'percent' or 'amount'
    };
  }));

  const cityKey  = city.toLowerCase().trim();
  const center   = CITY_COORDS[cityKey] || { lat: 20.5937, lng: 78.9629, name: city };

  res.json({
    source,
    center: { lat: center.lat, lng: center.lng, name: center.name },
    count:  marginedResults.length,
    results: marginedResults,
  });
});

export default router;
