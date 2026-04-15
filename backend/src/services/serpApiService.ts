import axios from 'axios';

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_BASE = 'https://serpapi.com/search';

// ── Simple in-memory cache (TTL: 10 minutes) ────────────────────────────────
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(city: string, checkIn: string, checkOut: string, guests: number) {
  return `${city.toLowerCase()}_${checkIn}_${checkOut}_${guests}`;
}

function getCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
}
// ─────────────────────────────────────────────────────────────────────────────

export interface SerpHotel {
  id: number;
  name: string;
  city: string;
  address: string;
  description: string;
  images: string[];      // MAX 1 image on listing, more in detail
  rating: number;
  reviewCount: number;
  starRating: number;
  amenities: string[];
  minPrice: number;
  rooms: SerpRoom[];
  source: 'live';
  serpApiId?: string;
}

export interface SerpRoom {
  id: string;
  type: string;
  pricePerNight: number;
  maxOccupancy: number;
  description: string;
  images: string[];
  available: boolean;
}

export async function searchHotelsLive(params: {
  city: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}): Promise<SerpHotel[]> {
  const { city, guests = 2 } = params;

  // Default dates (Google Hotels requires them)
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const checkIn = params.checkIn || fmt(today);
  const checkOut = params.checkOut || fmt(tomorrow);

  // ── Check cache ────────────────────────────────────────────────────────────
  const cacheKey = getCacheKey(city, checkIn, checkOut, guests);
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit for ${city} (${checkIn} → ${checkOut})`);
    return cached;
  }
  // ──────────────────────────────────────────────────────────────────────────

  const query: Record<string, string> = {
    engine: 'google_hotels',
    q: `hotels in ${city}`,
    api_key: SERPAPI_KEY!,
    currency: 'INR',
    gl: 'in',
    hl: 'en',
    adults: String(guests),
    check_in_date: checkIn,
    check_out_date: checkOut,
  };

  const response = await axios.get(SERPAPI_BASE, { params: query, timeout: 15000 });
  const properties: any[] = response.data.properties || [];

  const result = properties.slice(0, 12).map((p: any, idx: number) => {
    const price = p.rate_per_night?.lowest
      ? parseFloat(p.rate_per_night.lowest.replace(/[^0-9.]/g, ''))
      : 3000 + idx * 500;

    // ── Only keep 1 thumbnail for the listing view (saves memory) ───────────
    const thumbnailImage: string[] = [];
    if (p.images?.[0]) {
      const src = p.images[0].thumbnail; // Small thumbnail only
      if (src) thumbnailImage.push(src);
    }
    if (thumbnailImage.length === 0 && p.thumbnail) thumbnailImage.push(p.thumbnail);

    // ── Keep up to 4 images only for the detail/modal view ──────────────────
    const detailImages: string[] = [];
    if (p.images) {
      p.images.slice(0, 4).forEach((img: any) => {
        const src = img.thumbnail || img.original_image;
        if (src) detailImages.push(src);
      });
    }
    if (detailImages.length === 0 && p.thumbnail) detailImages.push(p.thumbnail);

    const amenities: string[] = [];
    if (p.amenities) {
      p.amenities.slice(0, 8).forEach((a: any) => {
        if (typeof a === 'string') amenities.push(a);
        else if (a.name) amenities.push(a.name);
      });
    }

    const rooms: SerpRoom[] = [
      {
        id: `${p.property_token || idx}-standard`,
        type: 'Standard Room',
        pricePerNight: Math.round(price),
        maxOccupancy: 2,
        description: 'Comfortable standard room with all essential amenities.',
        images: detailImages,
        available: true,
      },
      {
        id: `${p.property_token || idx}-deluxe`,
        type: 'Deluxe Room',
        pricePerNight: Math.round(price * 1.5),
        maxOccupancy: 2,
        description: 'Spacious deluxe room with premium furnishings and enhanced views.',
        images: detailImages,
        available: true,
      },
      {
        id: `${p.property_token || idx}-suite`,
        type: 'Junior Suite',
        pricePerNight: Math.round(price * 2.2),
        maxOccupancy: 3,
        description: 'Elegant suite with a separate sitting area and upgraded amenities.',
        images: detailImages,
        available: true,
      },
    ];

    return {
      id: idx + 10000,
      name: p.name || 'Unknown Hotel',
      city,
      address: p.description || `${city}, India`,
      description: `Experience premium hospitality at ${p.name || 'this hotel'} in ${city}.`,
      images: thumbnailImage,   // LISTING uses only 1 thumbnail
      detailImages,              // MODAL uses full images
      rating: p.overall_rating || p.rating || 4.0,
      reviewCount: p.reviews || 0,
      starRating: p.hotel_class ? parseInt(p.hotel_class) : 4,
      amenities,
      minPrice: Math.round(price),
      rooms,
      source: 'live' as const,
      serpApiId: p.property_token,
    } as SerpHotel & { detailImages: string[] };
  });

  // ── Store in cache ─────────────────────────────────────────────────────────
  setCache(cacheKey, result);
  return result;
}
