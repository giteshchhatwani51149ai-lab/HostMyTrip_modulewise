import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Hotel, Room, Review, Setting } from '../models';
import { User } from '../models/User';
import { searchHotelsLive, SerpHotel } from '../services/serpApiService';
import { searchAmadeusHotels } from '../services/amadeusService';
import { getEffectiveMargin, calculatePriceWithMargin, saveLivePrice } from '../utils/settingsCache';

// Safe JSON parse helper
function safeParseJson(val: any, fallback: any = []) {
  try { return typeof val === 'string' ? JSON.parse(val) : (val ?? fallback); } catch { return fallback; }
}

/**
 * GET /api/hotels/search?city=Mumbai&checkIn=2026-05-01&checkOut=2026-05-03&guests=2
 * Uses SerpApi Google Hotels live data as primary source.
 * Falls back to DB data if SerpApi fails.
 * Applies margin percentage to live API prices and saves actual prices for audit.
 */
export const searchHotels = async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, checkIn, checkOut, guests = 2 } = req.query;

    if (!city) {
      res.status(400).json({ message: 'City is required for search' });
      return;
    }

    const searchParams = {
      city: String(city),
      checkIn: checkIn ? String(checkIn) : undefined,
      checkOut: checkOut ? String(checkOut) : undefined,
      guests: Number(guests),
    };

    // --- Fetch Effective Margin based on user (corporate or end-user) ---
    const userId = (req as any).user?.id;
    const margin = await getEffectiveMargin(userId, 'hotel');

    // --- Try SerpApi live data first ---
    try {
      console.log(`🔍 Searching live hotels for: ${city}`);
      const liveHotels = await searchHotelsLive(searchParams);

      if (liveHotels.length > 0) {
        console.log(`✅ SerpApi returned ${liveHotels.length} live hotels`);

        // Apply Margin to Live Hotels and save actual prices
        const marginedLive = await Promise.all(liveHotels.map(async (h) => {
          const actualMinPrice = h.minPrice;
          const { finalPrice: finalMinPrice, marginApplied } = calculatePriceWithMargin(actualMinPrice, margin);

          // Save actual price with margin to LivePrice table (fire and forget)
          saveLivePrice({
            type: 'hotel',
            externalId: h.serpApiId || `serp-${h.id}`,
            source: 'serpapi',
            searchParams,
            actualPrice: actualMinPrice,
            marginPercent: margin.method === 'percent' ? margin.percent : 0,
            currency: 'INR',
            ttlMinutes: 60,
          }).catch(err => console.error('Failed to save live price:', err));

          // Apply margin to rooms
          const marginedRooms = h.rooms ? h.rooms.map((r: any) => {
            const actualRoomPrice = r.pricePerNight;
            const { finalPrice: finalRoomPrice, marginApplied: roomMarginApplied } = calculatePriceWithMargin(actualRoomPrice, margin);
            return {
              ...r,
              actualPrice: actualRoomPrice,
              pricePerNight: finalRoomPrice,
              marginApplied: roomMarginApplied,
            };
          }) : [];

          return {
            ...h,
            actualMinPrice,
            minPrice: finalMinPrice,
            marginApplied,
            rooms: marginedRooms,
            marginType: margin.type,
            marginMethod: margin.method,
          };
        }));

        res.status(200).json(marginedLive);
        return;
      }
    } catch (serpErr: any) {
      console.warn(`⚠️ SerpApi failed, falling back to DB: ${serpErr.message}`);
    }

    // --- Fallback: search DB ---
    const hotels = await Hotel.findAll({
      where: { city: { [Op.like]: `%${city}%` } },
      include: [
        {
          model: Room,
          as: 'rooms',
          where: { maxOccupancy: { [Op.gte]: Number(guests) }, available: true },
          required: true,
        },
        {
          model: Review,
          as: 'reviews',
          attributes: ['rating', 'comment', 'createdAt'],
          limit: 3,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    const enriched = (hotels as any[]).map((hotel) => {
      const h = hotel.toJSON();
      h.images = safeParseJson(h.images, []);
      h.amenities = safeParseJson(h.amenities, []);
      h.rooms = (h.rooms || []).map((r: any) => {
        const actualPrice = r.pricePerNight;
        const { finalPrice, marginApplied } = calculatePriceWithMargin(actualPrice, margin);
        return {
          ...r,
          images: safeParseJson(r.images, []),
          actualPrice,
          pricePerNight: finalPrice,
          marginApplied,
        };
      });
      h.minPrice = h.rooms.length > 0 ? Math.min(...h.rooms.map((r: any) => r.pricePerNight)) : 0;
      h.source = 'db';
      h.marginType = margin.type;
      h.marginMethod = margin.method;
      return h;
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * GET /api/hotels/:id — DB hotel detail
 */
export const getHotelById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const hotel = await Hotel.findByPk(Number(id), {
      include: [
        { model: Room, as: 'rooms' },
        {
          model: Review,
          as: 'reviews',
          include: [{ model: User, as: 'user', attributes: ['email'] }],
        },
      ],
    });

    // Get effective margin based on user
    const userId = (req as any).user?.id;
    const margin = await getEffectiveMargin(userId, 'hotel');

    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' });
      return;
    }

    const h = hotel.toJSON() as any;
    h.images = safeParseJson(h.images, []);
    h.amenities = safeParseJson(h.amenities, []);
    h.rooms = (h.rooms || []).map((r: any) => {
      const actualPrice = r.pricePerNight;
      const { finalPrice, marginApplied } = calculatePriceWithMargin(actualPrice, margin);
      return {
        ...r,
        images: safeParseJson(r.images, []),
        actualPrice,
        pricePerNight: finalPrice,
        marginApplied,
      };
    });
    h.marginType = margin.type;
    h.marginMethod = margin.method;

    res.status(200).json(h);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * GET /api/hotels — list all from DB (for admin and listing page before search)
 */
export const getAllHotels = async (req: Request, res: Response): Promise<void> => {
  try {
    const hotels = await Hotel.findAll({
      include: [
        { model: Room, as: 'rooms', where: { available: true }, required: false },
      ],
      order: [['rating', 'DESC']],
    });

    // Get effective margin based on user
    const userId = (req as any).user?.id;
    const margin = await getEffectiveMargin(userId, 'hotel');

    const enriched = (hotels as any[]).map((hotel) => {
      const h = hotel.toJSON();
      h.images = safeParseJson(h.images, []);
      h.amenities = safeParseJson(h.amenities, []);
      h.rooms = (h.rooms || []).map((r: any) => {
        const actualPrice = r.pricePerNight;
        const { finalPrice, marginApplied } = calculatePriceWithMargin(actualPrice, margin);
        return {
          ...r,
          images: safeParseJson(r.images, []),
          actualPrice,
          pricePerNight: finalPrice,
          marginApplied,
        };
      });
      h.minPrice = h.rooms.length > 0 ? Math.min(...h.rooms.map((r: any) => r.pricePerNight)) : 0;
      h.marginType = margin.type;
      h.marginMethod = margin.method;
      return h;
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * GET /api/hotels/amadeus/search?city=Paris&checkIn=2026-06-01&checkOut=2026-06-03&guests=2
 * Searches real hotel inventory + pricing via Amadeus APIs.
 * Falls back gracefully if Amadeus keys are not configured.
 * Applies margin percentage and saves actual prices for audit.
 */
export const searchHotelsAmadeus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, checkIn, checkOut, guests = '2' } = req.query;
    if (!city || !checkIn || !checkOut) {
      res.status(400).json({ message: 'city, checkIn, and checkOut are required' });
      return;
    }

    if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
      res.status(503).json({ message: 'Amadeus API keys not configured. Please add AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET to backend .env' });
      return;
    }

    const searchParams = {
      city: String(city),
      checkIn: String(checkIn),
      checkOut: String(checkOut),
      adults: Number(guests),
    };

    // Get effective margin based on user
    const userId = (req as any).user?.id;
    const margin = await getEffectiveMargin(userId, 'hotel');

    const hotels = await searchAmadeusHotels(searchParams);

    // Apply margin to all prices and save actual prices
    const withMargin = await Promise.all(hotels.map(async (h: any) => {
      const actualMinPrice = h.minPrice;
      const { finalPrice: finalMinPrice, marginApplied } = calculatePriceWithMargin(actualMinPrice, margin);

      // Save actual price to LivePrice table
      saveLivePrice({
        type: 'hotel',
        externalId: h.id || `amadeus-${h.name}`,
        source: 'amadeus',
        searchParams,
        actualPrice: actualMinPrice,
        marginPercent: margin.method === 'percent' ? margin.percent : 0,
        currency: 'INR',
        ttlMinutes: 60,
      }).catch(err => console.error('Failed to save live price:', err));

      return {
        ...h,
        actualMinPrice,
        minPrice: finalMinPrice,
        marginApplied,
        marginType: margin.type,
        marginMethod: margin.method,
        rooms: (h.rooms || []).map((r: any) => {
          const actualRoomPrice = r.pricePerNight;
          const { finalPrice: finalRoomPrice, marginApplied: roomMarginApplied } = calculatePriceWithMargin(actualRoomPrice, margin);
          return {
            ...r,
            actualPrice: actualRoomPrice,
            pricePerNight: finalRoomPrice,
            marginApplied: roomMarginApplied,
          };
        }),
      };
    }));

    res.status(200).json(withMargin);
  } catch (error: any) {
    console.error('Amadeus search error:', error?.description || error?.message || error);
    if (error?.message === 'AMADEUS_KEYS_MISSING') {
      res.status(503).json({ message: 'Amadeus API keys are not set up yet.' });
    } else {
      res.status(500).json({ message: 'Amadeus hotel search failed', detail: error?.description || error?.message });
    }
  }
};
