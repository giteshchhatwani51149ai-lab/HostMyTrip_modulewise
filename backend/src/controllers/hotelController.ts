import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Hotel, Room, Review, Setting } from '../models';
import { User } from '../models/User';
import { searchHotelsLive } from '../services/serpApiService';
import { searchAmadeusHotels } from '../services/amadeusService';

// Safe JSON parse helper
function safeParseJson(val: any, fallback: any = []) {
  try { return typeof val === 'string' ? JSON.parse(val) : (val ?? fallback); } catch { return fallback; }
}

/**
 * GET /api/hotels/search?city=Mumbai&checkIn=2026-05-01&checkOut=2026-05-03&guests=2
 * Uses SerpApi Google Hotels live data as primary source.
 * Falls back to DB data if SerpApi fails.
 */
export const searchHotels = async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, checkIn, checkOut, guests = 2 } = req.query;

    if (!city) {
      res.status(400).json({ message: 'City is required for search' });
      return;
    }

    // --- Fetch Margin ---
    let marginPercent = 10; // Default 10%
    try {
      const marginSetting = await Setting.findByPk('hotel_margin_percent');
      if (marginSetting) marginPercent = Number(marginSetting.val) || 0;
    } catch (e) {}
    const marginMultiplier = 1 + (marginPercent / 100);


    // --- Try SerpApi live data first ---
    try {
      console.log(`🔍 Searching live hotels for: ${city}`);
      const liveHotels = await searchHotelsLive({
        city: String(city),
        checkIn: checkIn ? String(checkIn) : undefined,
        checkOut: checkOut ? String(checkOut) : undefined,
        guests: Number(guests),
      });

      if (liveHotels.length > 0) {
        console.log(`✅ SerpApi returned ${liveHotels.length} live hotels`);
        
        // Apply Margin to Live Hotels
        const marginedLive = liveHotels.map(h => {
          h.minPrice = Math.ceil(h.minPrice * marginMultiplier);
          if (h.rooms) {
            h.rooms = h.rooms.map((r: any) => ({
              ...r,
              pricePerNight: Math.ceil(r.pricePerNight * marginMultiplier)
            }));
          }
          return h;
        });
        
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
      h.rooms = (h.rooms || []).map((r: any) => ({ 
        ...r, 
        images: safeParseJson(r.images, []),
        pricePerNight: Math.ceil(r.pricePerNight * marginMultiplier)
      }));
      h.minPrice = h.rooms.length > 0 ? Math.min(...h.rooms.map((r: any) => r.pricePerNight)) : 0;
      h.source = 'db';
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

    let marginPercent = 10;
    try {
      const marginSetting = await Setting.findByPk('hotel_margin_percent');
      if (marginSetting) marginPercent = Number(marginSetting.val) || 0;
    } catch (e) {}
    const marginMultiplier = 1 + (marginPercent / 100);


    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' });
      return;
    }

    const h = hotel.toJSON() as any;
    h.images = safeParseJson(h.images, []);
    h.amenities = safeParseJson(h.amenities, []);
    h.rooms = (h.rooms || []).map((r: any) => ({ 
      ...r, 
      images: safeParseJson(r.images, []),
      pricePerNight: Math.ceil(r.pricePerNight * marginMultiplier)
    }));

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

    let marginPercent = 10;
    try {
      const marginSetting = await Setting.findByPk('hotel_margin_percent');
      if (marginSetting) marginPercent = Number(marginSetting.val) || 0;
    } catch (e) {}
    const marginMultiplier = 1 + (marginPercent / 100);


    const enriched = (hotels as any[]).map((hotel) => {
      const h = hotel.toJSON();
      h.images = safeParseJson(h.images, []);
      h.amenities = safeParseJson(h.amenities, []);
      h.rooms = (h.rooms || []).map((r: any) => ({ 
        ...r, 
        images: safeParseJson(r.images, []),
        pricePerNight: Math.ceil(r.pricePerNight * marginMultiplier)
      }));
      h.minPrice = h.rooms.length > 0 ? Math.min(...h.rooms.map((r: any) => r.pricePerNight)) : 0;
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

    // Apply margin
    let marginPercent = 10;
    try {
      const marginSetting = await Setting.findByPk('hotel_margin_percent');
      if (marginSetting) marginPercent = Number(marginSetting.val) || 0;
    } catch (e) {}
    const marginMultiplier = 1 + (marginPercent / 100);

    const hotels = await searchAmadeusHotels({
      city:     String(city),
      checkIn:  String(checkIn),
      checkOut: String(checkOut),
      adults:   Number(guests),
    });

    // Apply margin to all prices
    const withMargin = hotels.map(h => ({
      ...h,
      minPrice: Math.ceil(h.minPrice * marginMultiplier),
      rooms: (h.rooms || []).map((r: any) => ({
        ...r,
        pricePerNight: Math.ceil(r.pricePerNight * marginMultiplier),
      })),
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
