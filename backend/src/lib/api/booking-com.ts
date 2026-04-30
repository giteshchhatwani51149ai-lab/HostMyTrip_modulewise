/**
 * Booking.com Affiliate API Client
 * ─────────────────────────────────
 * TypeScript client for Booking.com Demand API (affiliate partner program).
 *
 * Features:
 *  • HTTP client with exponential-backoff retry logic
 *  • Response caching (15-30 min TTL)
 *  • Typed errors (BookingComError)
 *  • Rate limiting protection (sliding window)
 *
 * Environment variables:
 *  • BOOKING_COM_API_KEY        — affiliate partner API key (required)
 *  • BOOKING_COM_AFFILIATE_ID   — partner / affiliate ID for booking deep links
 *  • BOOKING_COM_BASE_URL       — override base URL (defaults to demand-api endpoint)
 *
 * Docs: https://developers.booking.com/connectivity/docs/demand-api
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

/* ─── Public types ──────────────────────────────────────────────────────── */

export interface HotelSearchParams {
  city:        string;
  checkIn:     string;          // YYYY-MM-DD
  checkOut:    string;          // YYYY-MM-DD
  rooms:       number;
  adults:      number;
  children?:   number;
  priceRange?: { min: number; max: number };
  starRating?: number[];
  amenities?:  string[];
  currency?:   string;          // default INR
  locale?:     string;          // default en-gb
}

export interface HotelResult {
  id:          string;
  name:        string;
  starRating:  number;
  address:     string;
  city:        string;
  latitude:    number;
  longitude:   number;
  photos:      string[];
  price: {
    amount:    number;
    currency:  string;
    perNight:  boolean;
  };
  rating: {
    score:        number;       // 0–10
    reviewCount:  number;
  };
  bookingUrl:  string;          // affiliate deep link
}

export interface RoomType {
  id:          string;
  name:        string;
  description: string;
  maxGuests:   number;
  pricePerNight: number;
  currency:    string;
  amenities:   string[];
  refundable:  boolean;
}

export interface HotelDetails extends HotelResult {
  description: string;
  amenities:   string[];
  rooms:       RoomType[];
  reviews: {
    score:    number;
    count:    number;
    breakdown?: Record<string, number>;
    samples?:  Array<{ author: string; text: string; date: string; score: number }>;
  };
  policies?: {
    checkIn?:  string;
    checkOut?: string;
    cancellation?: string;
  };
}

/* ─── Custom typed error ────────────────────────────────────────────────── */

export type BookingComErrorCode =
  | 'NO_KEY' | 'RATE_LIMITED' | 'NOT_FOUND' | 'TIMEOUT'
  | 'NETWORK' | 'API_ERROR' | 'INVALID_PARAMS';

export class BookingComError extends Error {
  constructor(
    message: string,
    public readonly code: BookingComErrorCode,
    public readonly status?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'BookingComError';
  }
}

/* ─── In-memory TTL cache ───────────────────────────────────────────────── */

interface CacheEntry<T> { data: T; expiresAt: number; }

class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  constructor(private readonly ttlMs: number) {}

  get(key: string): T | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) { this.store.delete(key); return null; }
    return e.data;
  }
  set(key: string, data: T): void {
    this.store.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }
  clear(): void { this.store.clear(); }
}

/* ─── Sliding-window rate limiter ───────────────────────────────────────── */

class RateLimiter {
  private timestamps: number[] = [];
  constructor(
    private readonly maxRequests: number,
    private readonly windowMs:    number = 60_000,
  ) {}

  check(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) return false;
    this.timestamps.push(now);
    return true;
  }
}

/* ─── Booking.com Affiliate API Client ──────────────────────────────────── */

export class BookingComClient {
  private readonly http: AxiosInstance;
  private readonly searchCache = new TTLCache<HotelResult[]>(30 * 60_000);  // 30 min
  private readonly detailCache = new TTLCache<HotelDetails>(15 * 60_000);   // 15 min
  private readonly limiter     = new RateLimiter(60); // 60 req/min

  constructor() {
    this.http = axios.create({
      baseURL: process.env.BOOKING_COM_BASE_URL || 'https://demandapi.booking.com/3.1',
      timeout: 15_000,
    });

    // Inject auth headers lazily (after dotenv has loaded)
    this.http.interceptors.request.use((cfg) => {
      const key = process.env.BOOKING_COM_API_KEY || '';
      cfg.headers.set('Authorization', `Bearer ${key}`);
      cfg.headers.set('Accept',        'application/json');
      cfg.headers.set('Content-Type',  'application/json');
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(`[BookingCom] ${cfg.method?.toUpperCase()} ${cfg.url}`);
      }
      return cfg;
    });

    // Log errors
    this.http.interceptors.response.use(
      (r) => r,
      (err: AxiosError) => {
        // eslint-disable-next-line no-console
        console.error('[BookingCom] Error:', err.response?.data || err.message);
        return Promise.reject(err);
      },
    );
  }

  /** Public — quickly verify the key is configured. */
  hasKey(): boolean {
    const k = process.env.BOOKING_COM_API_KEY || '';
    return k.length > 4 && !k.startsWith('YOUR_');
  }

  /* ── PUBLIC: searchHotels ──────────────────────────────────────────── */

  /**
   * Search hotels by city / dates / occupancy.
   * Returns availability with affiliate booking URLs.
   * @throws {BookingComError} on validation or API errors
   */
  async searchHotels(params: HotelSearchParams): Promise<HotelResult[]> {
    this.assertKey();
    this.validateSearchParams(params);
    if (!this.limiter.check()) {
      throw new BookingComError('Rate limit exceeded (60 req/min)', 'RATE_LIMITED', 429);
    }

    const cacheKey = JSON.stringify(params);
    const cached   = this.searchCache.get(cacheKey);
    if (cached) return cached;

    const body = {
      city:         params.city,
      checkin:      params.checkIn,
      checkout:     params.checkOut,
      rooms:        params.rooms,
      adults:       params.adults,
      children:     params.children   ?? 0,
      currency:     params.currency   ?? 'INR',
      locale:       params.locale     ?? 'en-gb',
      ...(params.priceRange && {
        price_min: params.priceRange.min,
        price_max: params.priceRange.max,
      }),
      ...(params.starRating?.length && { star_rating: params.starRating }),
      ...(params.amenities?.length  && { amenities:   params.amenities }),
    };

    const data = await this.requestWithRetry<any>('POST', '/accommodations/search', body);

    const results: HotelResult[] = (data?.results || data?.accommodations || [])
      .map((h: any) => this.normalizeHotel(h));

    this.searchCache.set(cacheKey, results);
    return results;
  }

  /* ── PUBLIC: getHotelDetails ───────────────────────────────────────── */

  /**
   * Fetch full hotel details by ID — photos, room types, amenities, reviews.
   * @throws {BookingComError} when not found or API error
   */
  async getHotelDetails(hotelId: string): Promise<HotelDetails> {
    this.assertKey();
    if (!hotelId) {
      throw new BookingComError('hotelId is required', 'INVALID_PARAMS', 400);
    }
    if (!this.limiter.check()) {
      throw new BookingComError('Rate limit exceeded (60 req/min)', 'RATE_LIMITED', 429);
    }

    const cached = this.detailCache.get(hotelId);
    if (cached) return cached;

    const data = await this.requestWithRetry<any>('GET', `/accommodations/${hotelId}`);
    if (!data) {
      throw new BookingComError(`Hotel ${hotelId} not found`, 'NOT_FOUND', 404);
    }

    const details = this.normalizeDetails(data);
    this.detailCache.set(hotelId, details);
    return details;
  }

  /* ── PUBLIC: utilities ─────────────────────────────────────────────── */

  /** Clear all cached results — useful after a price refresh window. */
  clearCache(): void {
    this.searchCache.clear();
    this.detailCache.clear();
  }

  /* ── Private: request with exponential-backoff retry ───────────────── */

  private async requestWithRetry<T>(
    method: 'GET' | 'POST',
    url:    string,
    body?:  unknown,
    attempt = 0,
  ): Promise<T> {
    const MAX_RETRIES = 3;
    const baseDelay   = 500;
    try {
      const res = method === 'GET'
        ? await this.http.get<T>(url)
        : await this.http.post<T>(url, body);
      return res.data;
    } catch (err) {
      const axErr  = err as AxiosError<any>;
      const status = axErr.response?.status;
      const code   = axErr.code;

      // Map errors to typed BookingComError where possible
      if (status === 401 || status === 403) {
        throw new BookingComError('Invalid Booking.com API key', 'NO_KEY', status);
      }
      if (status === 404) {
        throw new BookingComError('Resource not found', 'NOT_FOUND', 404);
      }
      if (status === 429) {
        // Retry once with backoff for rate-limit
        if (attempt < MAX_RETRIES) {
          const wait = this.computeBackoff(attempt, baseDelay, axErr.response?.headers?.['retry-after']);
          await this.sleep(wait);
          return this.requestWithRetry<T>(method, url, body, attempt + 1);
        }
        throw new BookingComError('Rate limited by Booking.com', 'RATE_LIMITED', 429);
      }

      // Retry on network errors and 5xx
      const transient = code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND'
        || code === 'ECONNRESET' || (status && status >= 500);

      if (transient && attempt < MAX_RETRIES) {
        await this.sleep(this.computeBackoff(attempt, baseDelay));
        return this.requestWithRetry<T>(method, url, body, attempt + 1);
      }

      if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
        throw new BookingComError('Booking.com request timed out', 'TIMEOUT', 504, err);
      }
      if (!status) {
        throw new BookingComError('Network error contacting Booking.com', 'NETWORK', undefined, err);
      }
      throw new BookingComError(
        axErr.response?.data?.message || axErr.message || 'Booking.com API error',
        'API_ERROR',
        status,
        err,
      );
    }
  }

  private computeBackoff(attempt: number, base: number, retryAfter?: string | number): number {
    if (retryAfter) {
      const n = Number(retryAfter);
      if (!isNaN(n)) return n * 1000;
    }
    // Exponential with full jitter: base * 2^attempt * random(0..1)
    return Math.floor(base * Math.pow(2, attempt) * (0.5 + Math.random() / 2));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /* ── Private: validation & helpers ─────────────────────────────────── */

  private assertKey(): void {
    if (!this.hasKey()) {
      throw new BookingComError('BOOKING_COM_API_KEY is not set in .env', 'NO_KEY');
    }
  }

  private validateSearchParams(p: HotelSearchParams): void {
    if (!p.city)      throw new BookingComError('city is required', 'INVALID_PARAMS');
    if (!p.checkIn)   throw new BookingComError('checkIn is required (YYYY-MM-DD)', 'INVALID_PARAMS');
    if (!p.checkOut)  throw new BookingComError('checkOut is required (YYYY-MM-DD)', 'INVALID_PARAMS');
    if (p.checkIn >= p.checkOut) {
      throw new BookingComError('checkOut must be after checkIn', 'INVALID_PARAMS');
    }
    if (!p.rooms || p.rooms < 1)   throw new BookingComError('rooms must be ≥ 1', 'INVALID_PARAMS');
    if (!p.adults || p.adults < 1) throw new BookingComError('adults must be ≥ 1', 'INVALID_PARAMS');
    if (p.priceRange && p.priceRange.min > p.priceRange.max) {
      throw new BookingComError('priceRange.min must be ≤ max', 'INVALID_PARAMS');
    }
  }

  private affiliateLink(hotelId: string): string {
    const aid = process.env.BOOKING_COM_AFFILIATE_ID || '';
    const aidParam = aid ? `?aid=${encodeURIComponent(aid)}` : '';
    return `https://www.booking.com/hotel/${hotelId}.html${aidParam}`;
  }

  /** Convert raw API hotel to typed HotelResult. */
  private normalizeHotel(raw: any): HotelResult {
    const id = String(raw?.id ?? raw?.hotel_id ?? raw?.accommodation_id ?? '');
    return {
      id,
      name:        raw?.name ?? raw?.hotel_name ?? 'Unknown',
      starRating:  Number(raw?.class ?? raw?.star_rating ?? 0),
      address:     raw?.address ?? raw?.location?.address ?? '',
      city:        raw?.city    ?? raw?.location?.city    ?? '',
      latitude:    Number(raw?.latitude  ?? raw?.location?.latitude  ?? 0),
      longitude:   Number(raw?.longitude ?? raw?.location?.longitude ?? 0),
      photos:      Array.isArray(raw?.photos) ? raw.photos
                  : Array.isArray(raw?.images) ? raw.images.map((i: any) => i?.url ?? i) : [],
      price: {
        amount:   Number(raw?.price?.amount ?? raw?.min_total_price ?? 0),
        currency: String(raw?.price?.currency ?? raw?.currency_code ?? 'INR'),
        perNight: raw?.price?.per_night ?? true,
      },
      rating: {
        score:       Number(raw?.review_score ?? raw?.rating?.score ?? 0),
        reviewCount: Number(raw?.review_count ?? raw?.rating?.count ?? 0),
      },
      bookingUrl: raw?.url || this.affiliateLink(id),
    };
  }

  private normalizeDetails(raw: any): HotelDetails {
    const base = this.normalizeHotel(raw);
    const rooms: RoomType[] = (raw?.rooms || raw?.room_types || []).map((r: any) => ({
      id:            String(r?.id ?? r?.room_id ?? ''),
      name:          r?.name ?? r?.room_name ?? '',
      description:   r?.description ?? '',
      maxGuests:     Number(r?.max_occupancy ?? r?.max_guests ?? 2),
      pricePerNight: Number(r?.price_per_night ?? r?.price?.amount ?? 0),
      currency:      String(r?.currency ?? base.price.currency),
      amenities:     Array.isArray(r?.amenities) ? r.amenities : [],
      refundable:    !!r?.refundable,
    }));
    return {
      ...base,
      description: raw?.description ?? raw?.summary ?? '',
      amenities:   Array.isArray(raw?.amenities) ? raw.amenities : [],
      rooms,
      reviews: {
        score:     Number(raw?.review_score ?? raw?.rating?.score ?? 0),
        count:     Number(raw?.review_count ?? raw?.rating?.count ?? 0),
        breakdown: raw?.review_score_word_breakdown ?? raw?.rating?.breakdown,
        samples:   raw?.review_samples ?? raw?.reviews,
      },
      policies: raw?.policies ?? {
        checkIn:      raw?.checkin?.from,
        checkOut:     raw?.checkout?.until,
        cancellation: raw?.cancellation_policy,
      },
    };
  }
}

// Singleton export
export const bookingCom = new BookingComClient();
