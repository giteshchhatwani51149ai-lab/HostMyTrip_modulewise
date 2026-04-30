/**
 * In-memory cache for app settings (e.g. hotel_margin_percent, flight_margin_percent).
 * Also handles corporate-specific margins.
 * Avoids hitting the DB on every hotel search / detail request.
 *
 * TTL: 5 minutes. Call invalidate(key) after updating a setting.
 */
import { Setting, LivePrice, Corporate, User } from '../models';

interface CacheEntry { value: any; expiresAt: number; }
const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export async function getSetting<T = string>(key: string, fallback: T): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  try {
    const row: any = await Setting.findByPk(key);
    const value = (row?.val ?? fallback) as T;
    cache.set(key, { value, expiresAt: now + TTL_MS });
    return value;
  } catch {
    return fallback;
  }
}

export async function getMarginMultiplier(type: 'hotel' | 'flight' = 'hotel'): Promise<number> {
  const settingKey = type === 'flight' ? 'flight_margin_percent' : 'hotel_margin_percent';
  const raw = await getSetting<string | number>(settingKey, 10);
  const pct = Number(raw) || 0;
  return 1 + pct / 100;
}

/**
 * Get both hotel and flight margin multipliers
 */
export async function getAllMarginMultipliers(): Promise<{ hotel: number; flight: number }> {
  const [hotel, flight] = await Promise.all([
    getMarginMultiplier('hotel'),
    getMarginMultiplier('flight'),
  ]);
  return { hotel, flight };
}

/**
 * Calculate final price with margin applied
 */
export function applyMargin(actualPrice: number, marginPercent: number): number {
  return Math.ceil(actualPrice * (1 + marginPercent / 100));
}

/**
 * Store live API price with margin for audit trail
 */
export async function saveLivePrice(data: {
  type: 'hotel' | 'flight';
  externalId: string;
  source: string;
  searchParams: Record<string, any>;
  actualPrice: number;
  marginPercent?: number;
  currency?: string;
  ttlMinutes?: number;
}): Promise<LivePrice> {
  const {
    type,
    externalId,
    source,
    searchParams,
    actualPrice,
    marginPercent: customMargin,
    currency = 'INR',
    ttlMinutes = 60,
  } = data;

  // Get current margin from settings if not provided
  const marginPercent = customMargin ?? (await getSetting<number>(`${type}_margin_percent`, 10));
  const finalPrice = applyMargin(actualPrice, marginPercent);

  const capturedAt = new Date();
  const expiresAt = new Date(capturedAt.getTime() + ttlMinutes * 60 * 1000);

  const livePrice = await LivePrice.create({
    type,
    externalId,
    source,
    searchParams,
    actualPrice,
    marginPercent,
    finalPrice,
    currency,
    capturedAt,
    expiresAt,
  });

  return livePrice;
}

export function invalidateSetting(key: string): void {
  cache.delete(key);
}

export function invalidateAllSettings(): void {
  cache.clear();
}

/**
 * Margin result structure
 */
export interface MarginResult {
  type: 'endUser' | 'corporate';
  method: 'percent' | 'amount';
  percent: number; // 0 if using amount
  amount: number;  // 0 if using percent
  multiplier: number; // 1 + percent/100 (for percent method)
}

/**
 * Get effective margin for a user.
 * - Corporate users: use corporate-specific margin (amount takes priority over percent)
 * - End users: use global platform margin
 *
 * @param userId - The user ID to check
 * @param type - 'hotel' or 'flight'
 * @returns MarginResult with type, method, percent, amount, and multiplier
 */
export async function getEffectiveMargin(
  userId: number | undefined,
  type: 'hotel' | 'flight'
): Promise<MarginResult> {
  // Default end-user margin
  const defaultPercent = await getSetting<number>(`${type}_margin_percent`, 10);

  // If no userId, return end-user margin
  if (!userId) {
    return {
      type: 'endUser',
      method: 'percent',
      percent: defaultPercent,
      amount: 0,
      multiplier: 1 + defaultPercent / 100,
    };
  }

  // Check if user is corporate user
  const user = await User.findByPk(userId, {
    include: [{ model: Corporate, as: 'corporate' }],
  }) as any;

  if (!user || !user.corporateId || !user.corporate) {
    return {
      type: 'endUser',
      method: 'percent',
      percent: defaultPercent,
      amount: 0,
      multiplier: 1 + defaultPercent / 100,
    };
  }

  // User is corporate - check corporate margin settings
  const corporate = user.corporate as Corporate;

  if (type === 'flight') {
    // Check if fixed amount is set (takes priority)
    if (corporate.flightMarginAmount && corporate.flightMarginAmount > 0) {
      return {
        type: 'corporate',
        method: 'amount',
        percent: 0,
        amount: Number(corporate.flightMarginAmount),
        multiplier: 1, // Not used for amount method
      };
    }
    // Check if percent is set
    if (corporate.flightMarginPercent && corporate.flightMarginPercent > 0) {
      const percent = Number(corporate.flightMarginPercent);
      return {
        type: 'corporate',
        method: 'percent',
        percent,
        amount: 0,
        multiplier: 1 + percent / 100,
      };
    }
  } else {
    // Hotel margins
    // Check if fixed amount is set (takes priority)
    if (corporate.hotelMarginAmount && corporate.hotelMarginAmount > 0) {
      return {
        type: 'corporate',
        method: 'amount',
        percent: 0,
        amount: Number(corporate.hotelMarginAmount),
        multiplier: 1, // Not used for amount method
      };
    }
    // Check if percent is set
    if (corporate.hotelMarginPercent && corporate.hotelMarginPercent > 0) {
      const percent = Number(corporate.hotelMarginPercent);
      return {
        type: 'corporate',
        method: 'percent',
        percent,
        amount: 0,
        multiplier: 1 + percent / 100,
      };
    }
  }

  // No corporate-specific margin set, fallback to end-user margin
  return {
    type: 'endUser',
    method: 'percent',
    percent: defaultPercent,
    amount: 0,
    multiplier: 1 + defaultPercent / 100,
  };
}

/**
 * Calculate final price with effective margin applied.
 * Handles both percentage and fixed amount methods.
 */
export function calculatePriceWithMargin(
  actualPrice: number,
  margin: MarginResult
): { finalPrice: number; marginApplied: number } {
  if (margin.method === 'amount') {
    const finalPrice = Math.ceil(actualPrice + margin.amount);
    return { finalPrice, marginApplied: margin.amount };
  } else {
    const finalPrice = Math.ceil(actualPrice * margin.multiplier);
    const marginApplied = finalPrice - actualPrice;
    return { finalPrice, marginApplied };
  }
}
