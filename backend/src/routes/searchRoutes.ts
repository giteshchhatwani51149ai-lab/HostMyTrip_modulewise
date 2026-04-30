import { Router, Request, Response } from 'express';
import Amadeus from 'amadeus';

const router = Router();

const amadeus = new Amadeus({
  clientId:     process.env.AMADEUS_CLIENT_ID     || '',
  clientSecret: process.env.AMADEUS_CLIENT_SECRET || '',
});

// GET /api/search/locations?q=lon
router.get('/locations', async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) return res.json([]);

  try {
    const response = await amadeus.referenceData.locations.get({
      keyword:  q,
      subType:  'CITY,AIRPORT',
      'page[limit]': '10',
    });

    const results = (response.data || []).map((loc: any) => ({
      code:    loc.iataCode,
      city:    loc.address?.cityName || loc.name,
      airport: loc.name,
      country: loc.address?.countryName || '',
      type:    loc.subType,
    }));

    res.json(results);
  } catch (err: any) {
    console.error('Location search error:', err?.description || err?.message || err);
    res.json([]);
  }
});

export default router;
