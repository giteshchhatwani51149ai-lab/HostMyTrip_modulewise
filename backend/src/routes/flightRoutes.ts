import { Router, Request, Response } from 'express';
import { travelpayouts, TravelpayoutsError } from '../lib/api/travelpayouts';
import { kiwiClient } from '../lib/api/kiwi';
import { getEffectiveMargin, calculatePriceWithMargin, saveLivePrice } from '../utils/settingsCache';

const router = Router();

/**
 * GET /api/flights/search
 * Query: origin, destination, departDate, returnDate?, adults?, children?, infants?, currency?
 *
 * Falls back to 503 with a clear message if TRAVELPAYOUTS_TOKEN is not set.
 * Applies margin (end-user or corporate-specific) to actual API prices before returning.
 */
router.get('/search', async (req: Request, res: Response) => {
  const { origin, destination, departDate, returnDate, adults = '1', children = '0', infants = '0', currency = 'INR' } = req.query;

  if (!origin || !destination || !departDate) {
    res.status(400).json({ message: 'origin, destination, and departDate are required' });
    return;
  }

  const searchParams = {
    origin: String(origin).toUpperCase(),
    destination: String(destination).toUpperCase(),
    departDate: String(departDate),
    returnDate: returnDate ? String(returnDate) : undefined,
    adults: Number(adults),
    children: Number(children),
    infants: Number(infants),
    currency: String(currency),
  };

  // Get effective margin based on user (corporate or end-user)
  const userId = (req as any).user?.id;
  const margin = await getEffectiveMargin(userId, 'flight');

  // Try Kiwi first (real-time), fall back to Travelpayouts (cached prices)
  try {
    let results: any[] = [];
    let source = 'travelpayouts';

    if (kiwiClient.hasKey()) {
      results = await kiwiClient.searchFlights(searchParams);
      source = 'kiwi';
    } else {
      results = await travelpayouts.searchFlights(searchParams);
    }

    // Apply margin and save actual prices to LivePrice table
    const marginedFlights = await Promise.all(
      results.map(async (flight) => {
        const actualPrice = flight.price;
        const { finalPrice, marginApplied } = calculatePriceWithMargin(actualPrice, margin);

        // Save actual price with margin to LivePrice table (fire and forget)
        saveLivePrice({
          type: 'flight',
          externalId: flight.id,
          source,
          searchParams,
          actualPrice,
          marginPercent: margin.method === 'percent' ? margin.percent : 0,
          currency: flight.currency || 'INR',
          ttlMinutes: 30,
        }).catch(err => console.error('Failed to save live price:', err));

        return {
          ...flight,
          price: finalPrice,
          actualPrice, // Include actual price for reference
          marginApplied, // How much margin was added
          marginType: margin.type, // 'endUser' or 'corporate'
          marginMethod: margin.method, // 'percent' or 'amount'
        };
      })
    );

    res.json({ flights: marginedFlights, count: marginedFlights.length, source });
  } catch (err: any) {
    if (err instanceof TravelpayoutsError) {
      if (err.code === 'NO_KEY') {
        res.status(503).json({
          message: 'No flight API key configured. Add KIWI_API_KEY to .env for live results.',
          code: 'NO_KEY',
        });
        return;
      }
      if (err.code === 'RATE_LIMITED') {
        res.status(429).json({ message: 'Too many requests. Please wait a moment.', code: 'RATE_LIMITED' });
        return;
      }
    }
    console.error('[FlightSearch] Error:', err.message);
    res.status(500).json({ message: 'Flight search failed. Please try again.', detail: err.message });
  }
});

/**
 * GET /api/flights/details/:id
 * Returns detailed info for a specific flight by composite ID.
 * Applies effective margin (end-user or corporate-specific) to the price.
 */
router.get('/details/:id', async (req: Request, res: Response) => {
  try {
    // Get effective margin based on user
    const userId = (req as any).user?.id;
    const margin = await getEffectiveMargin(userId, 'flight');

    const detail = await travelpayouts.getFlightDetails(String(req.params.id));

    // Apply margin to price
    const actualPrice = detail.price;
    const { finalPrice, marginApplied } = calculatePriceWithMargin(actualPrice, margin);

    res.json({
      ...detail,
      price: finalPrice,
      actualPrice,
      marginApplied,
      marginType: margin.type,
      marginMethod: margin.method,
    });
  } catch (err: any) {
    if (err instanceof TravelpayoutsError) {
      if (err.code === 'NO_KEY') {
        res.status(503).json({ message: 'Travelpayouts API key not configured.', code: 'NO_KEY' });
        return;
      }
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({ message: err.message });
        return;
      }
    }
    res.status(500).json({ message: 'Failed to get flight details.', detail: err.message });
  }
});

export default router;
