import axios, { AxiosInstance } from 'axios';
import { FlightSearchParams, FlightResult, FlightDetails, TravelpayoutsError } from './travelpayouts';

// ─── In-memory cache ────────────────────────────────────────────────────────

interface CacheEntry<T> { data: T; expiresAt: number; }

class SimpleCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  get(key: string): T | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) { this.store.delete(key); return null; }
    return e.data;
  }
  set(key: string, data: T): void {
    this.store.set(key, { data, expiresAt: Date.now() + 15 * 60 * 1000 });
  }
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  check(max = 100): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < 60_000);
    if (this.timestamps.length >= max) return false;
    this.timestamps.push(now);
    return true;
  }
}

// ─── Kiwi Tequila Client ─────────────────────────────────────────────────────
// Docs: https://tequila.kiwi.com/portal/docs/tequila-api/search_api

export class KiwiClient {
  private readonly http: AxiosInstance;
  private readonly cache = new SimpleCache<FlightResult[]>();
  private readonly detailCache = new SimpleCache<FlightDetails>();
  private readonly limiter = new RateLimiter();
  constructor() {
    this.http = axios.create({
      baseURL: 'https://tequila-api.kiwi.com',
      timeout: 15_000,
    });

    // Inject apikey lazily per-request so dotenv is already loaded
    this.http.interceptors.request.use(cfg => {
      cfg.headers.set('apikey', process.env.KIWI_API_KEY || '');
      cfg.headers.set('Accept', 'application/json');
      return cfg;
    });

    this.http.interceptors.request.use(cfg => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Kiwi] ${cfg.method?.toUpperCase()} ${cfg.url}`, cfg.params || {});
      }
      return cfg;
    });

    this.http.interceptors.response.use(
      r => r,
      err => {
        console.error('[Kiwi] Error:', err.response?.data || err.message);
        return Promise.reject(err);
      }
    );
  }

  hasKey(): boolean {
    const key = process.env.KIWI_API_KEY || '';
    return key.length > 4 && !key.startsWith('YOUR_');
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
    const apiKey = process.env.KIWI_API_KEY || '';
    if (!apiKey || apiKey.length <= 4 || apiKey.startsWith('YOUR_')) {
      throw new TravelpayoutsError('KIWI_API_KEY is not set in .env', 'NO_KEY');
    }
    if (!this.limiter.check()) {
      throw new TravelpayoutsError('Rate limit exceeded', 'RATE_LIMITED', 429);
    }

    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Kiwi uses DD/MM/YYYY for dates
    const fmtDate = (s: string) => {
      const [y, m, d] = s.split('-');
      return `${d}/${m}/${y}`;
    };

    const query: Record<string, any> = {
      fly_from:     params.origin,
      fly_to:       params.destination,
      date_from:    fmtDate(params.departDate),
      date_to:      fmtDate(params.departDate),
      adults:       params.adults,
      children:     params.children || 0,
      infants:      params.infants || 0,
      curr:         params.currency || 'INR',
      locale:       'en',
      limit:        20,
      sort:         'price',
      vehicle_type: 'aircraft',
      one_for_city: 0,
    };

    if (params.returnDate) {
      query.fly_back_from = fmtDate(params.returnDate);
      query.fly_back_to   = fmtDate(params.returnDate);
      query.flight_type   = 'round';
    } else {
      query.flight_type = 'oneway';
    }

    try {
      const res = await this.http.get('/v2/search', { params: query });
      const data = res.data?.data || [];
      const results = data.map((f: any) => this.normalizeKiwiFlight(f, params));
      this.cache.set(cacheKey, results);
      return results;
    } catch (err: any) {
      if (err instanceof TravelpayoutsError) throw err;
      throw new TravelpayoutsError(
        err.response?.data?.message || err.message || 'Kiwi API request failed',
        'API_ERROR',
        err.response?.status
      );
    }
  }

  async getFlightDetails(id: string): Promise<FlightDetails> {
    const cached = this.detailCache.get(id);
    if (cached) return cached;
    // For Kiwi, details come from the search result itself — return a minimal object
    throw new TravelpayoutsError(`Details not cached for flight ${id}`, 'NOT_FOUND', 404);
  }

  private normalizeKiwiFlight(f: any, params: FlightSearchParams): FlightResult {
    const depTime  = new Date(f.dTime  * 1000).toISOString();
    const arrTime  = new Date(f.aTime  * 1000).toISOString();
    const duration = Math.round(f.duration / 60); // seconds → minutes

    // Pick first carrier as "airline"
    const carrier  = f.airlines?.[0] || f.route?.[0]?.airline || 'Unknown';
    const flightNo = f.route?.[0]?.flight_no ? `${carrier}${f.route[0].flight_no}` : f.id;

    return {
      id:            f.id || `${params.origin}-${params.destination}-${f.dTime}`,
      airline:       f.route?.[0]?.airline_name || carrier,
      airlineCode:   carrier,
      flightNumber:  flightNo,
      origin:        f.flyFrom  || params.origin,
      destination:   f.flyTo    || params.destination,
      departureTime: depTime,
      arrivalTime:   arrTime,
      duration,
      stops:         (f.route?.length || 1) - 1,
      price:         Math.round(f.price || 0),
      currency:      params.currency || 'INR',
      bookingUrl:    f.deep_link || `https://www.kiwi.com/deep?from=${params.origin}&to=${params.destination}&departure=${params.departDate}`,
      seatsAvailable: f.availability?.seats ?? undefined,
      refundable:    false,
    };
  }
}

export const kiwiClient = new KiwiClient();
