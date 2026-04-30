import axios, { AxiosInstance } from 'axios';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface FlightSearchParams {
  origin: string;       // IATA code e.g. 'BOM'
  destination: string;  // IATA code e.g. 'DEL'
  departDate: string;   // YYYY-MM-DD
  returnDate?: string;  // YYYY-MM-DD (optional, for round-trip)
  adults: number;
  children?: number;
  infants?: number;
  currency?: string;    // default 'INR'
}

export interface FlightResult {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;  // ISO string
  arrivalTime: string;    // ISO string
  duration: number;       // minutes
  stops: number;
  price: number;          // in requested currency
  currency: string;
  bookingUrl: string;     // affiliate link
  seatsAvailable?: number;
  refundable?: boolean;
}

export interface FlightDetails {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  stops: number;
  price: number;
  currency: string;
  baggage?: string;
  meal?: boolean;
  bookingUrl: string;
}

// ─── In-memory cache ────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

class SimpleCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  clear(): void { this.store.clear(); }
}

// ─── Rate limiter ────────────────────────────────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxPerMin: number;

  constructor(maxPerMin = 100) { this.maxPerMin = maxPerMin; }

  check(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < 60_000);
    if (this.timestamps.length >= this.maxPerMin) return false;
    this.timestamps.push(now);
    return true;
  }
}

// ─── Custom error ────────────────────────────────────────────────────────────

export class TravelpayoutsError extends Error {
  constructor(
    message: string,
    public readonly code: 'RATE_LIMITED' | 'API_ERROR' | 'NO_KEY' | 'NOT_FOUND',
    public readonly status?: number
  ) {
    super(message);
    this.name = 'TravelpayoutsError';
  }
}

// ─── Travelpayouts API Client ────────────────────────────────────────────────

export class TravelpayoutsClient {
  private readonly http: AxiosInstance;
  private readonly cache = new SimpleCache<FlightResult[]>();
  private readonly detailCache = new SimpleCache<FlightDetails>();
  private readonly limiter = new RateLimiter(100);
  constructor() {
    this.http = axios.create({
      baseURL: 'https://api.travelpayouts.com',
      timeout: 10_000,
    });

    // Inject token lazily per-request so dotenv is loaded first
    this.http.interceptors.request.use((config) => {
      config.headers.set('X-Access-Token', process.env.TRAVELPAYOUTS_TOKEN || '');
      config.headers.set('Accept', 'application/json');
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Travelpayouts] ${config.method?.toUpperCase()} ${config.url}`, config.params || {});
      }
      return config;
    });

    // Response interceptor — log errors
    this.http.interceptors.response.use(
      (res) => res,
      (err) => {
        console.error('[Travelpayouts] Error:', err.response?.data || err.message);
        return Promise.reject(err);
      }
    );
  }

  private hasToken(): boolean {
    const t = process.env.TRAVELPAYOUTS_TOKEN || '';
    return t.length > 4;
  }

  /**
   * Search for flights between two IATA codes on a given date.
   * Uses Travelpayouts "Prices for each day of the month" endpoint.
   * Falls back gracefully if no API token is configured.
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
    if (!this.hasToken()) {
      throw new TravelpayoutsError(
        'TRAVELPAYOUTS_TOKEN is not set in .env',
        'NO_KEY'
      );
    }

    if (!this.limiter.check()) {
      throw new TravelpayoutsError('Rate limit exceeded (100 req/min)', 'RATE_LIMITED', 429);
    }

    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const currency = params.currency || 'INR';
      const depart   = params.departDate.slice(0, 7); // YYYY-MM

      const res = await this.http.get('/v1/prices/cheap', {
        params: {
          origin:      params.origin,
          destination: params.destination,
          depart_date: depart,
          return_date: params.returnDate?.slice(0, 7) || undefined,
          currency,
          token:       process.env.TRAVELPAYOUTS_TOKEN || '',
          limit:       30,
          one_way:     params.returnDate ? false : true,
        },
      });

      const raw = res.data?.data || {};
      const results = this.normalizeCheapFlights(raw, params);

      this.cache.set(cacheKey, results);
      return results;
    } catch (err: any) {
      if (err instanceof TravelpayoutsError) throw err;
      throw new TravelpayoutsError(
        err.response?.data?.message || err.message || 'API request failed',
        'API_ERROR',
        err.response?.status
      );
    }
  }

  /**
   * Get detailed info for a specific flight by its composite ID.
   * Format: "{origin}-{destination}-{date}-{flightNumber}"
   */
  async getFlightDetails(id: string): Promise<FlightDetails> {
    if (!this.hasToken()) {
      throw new TravelpayoutsError('TRAVELPAYOUTS_TOKEN is not set in .env', 'NO_KEY');
    }

    const cached = this.detailCache.get(id);
    if (cached) return cached;

    const parts = id.split('-');
    if (parts.length < 3) {
      throw new TravelpayoutsError(`Invalid flight ID: ${id}`, 'NOT_FOUND', 404);
    }

    const [origin, destination, date] = parts;

    try {
      const res = await this.http.get('/v1/prices/direct', {
        params: {
          origin,
          destination,
          depart_date: date.slice(0, 7),
          token: process.env.TRAVELPAYOUTS_TOKEN || '',
          currency: 'INR',
        },
      });

      const raw = res.data?.data?.[destination]?.[date.slice(0, 7)];
      if (!raw) {
        throw new TravelpayoutsError(`No details found for flight ${id}`, 'NOT_FOUND', 404);
      }

      const detail: FlightDetails = {
        id,
        airline:       raw.airline || 'Unknown',
        flightNumber:  raw.flight_number ? `${raw.airline}${raw.flight_number}` : id,
        origin,
        destination,
        departureTime: `${date}T${String(raw.departure_at || '').slice(11, 16) || '06:00'}:00`,
        arrivalTime:   `${date}T${String(raw.return_at || '').slice(11, 16) || '08:00'}:00`,
        duration:      raw.duration || raw.duration_to || 120,
        stops:         raw.transfers || 0,
        price:         raw.price || 0,
        currency:      'INR',
        baggage:       raw.baggage ? `${raw.baggage}kg` : '15kg',
        meal:          false,
        bookingUrl:    this.buildBookingUrl(origin, destination, date),
      };

      this.detailCache.set(id, detail);
      return detail;
    } catch (err: any) {
      if (err instanceof TravelpayoutsError) throw err;
      throw new TravelpayoutsError(
        err.response?.data?.message || err.message,
        'API_ERROR',
        err.response?.status
      );
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private normalizeCheapFlights(
    raw: Record<string, any>,
    params: FlightSearchParams
  ): FlightResult[] {
    const results: FlightResult[] = [];
    const currency = params.currency || 'INR';
    let index = 0;

    for (const dest of Object.values(raw)) {
      for (const [, entry] of Object.entries(dest as Record<string, any>)) {
        const e = entry as any;
        const depTime = e.departure_at ? new Date(e.departure_at) : new Date(`${params.departDate}T06:00:00`);
        const dur = e.duration || e.duration_to || 120;
        const arrTime = new Date(depTime.getTime() + dur * 60_000);

        results.push({
          id:            `${params.origin}-${params.destination}-${params.departDate}-${e.flight_number || index}`,
          airline:       e.airline || 'Unknown',
          airlineCode:   e.airline || 'XX',
          flightNumber:  e.flight_number ? `${e.airline}${e.flight_number}` : `FL${1000 + index}`,
          origin:        params.origin,
          destination:   params.destination,
          departureTime: depTime.toISOString(),
          arrivalTime:   arrTime.toISOString(),
          duration:      dur,
          stops:         e.transfers || 0,
          price:         e.price || 0,
          currency,
          bookingUrl:    this.buildBookingUrl(params.origin, params.destination, params.departDate),
          seatsAvailable: undefined,
          refundable:     false,
        });
        index++;
      }
    }

    return results.sort((a, b) => a.price - b.price);
  }

  private buildBookingUrl(origin: string, destination: string, date: string): string {
    const marker = process.env.TRAVELPAYOUTS_MARKER ? `&marker=${process.env.TRAVELPAYOUTS_MARKER}` : '';
    return `https://www.aviasales.com/search/${origin}${date.replace(/-/g, '')}${destination}1?currency=inr${marker}`;
  }
}

// Singleton export
export const travelpayouts = new TravelpayoutsClient();
