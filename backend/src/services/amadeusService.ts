import Amadeus from 'amadeus';

// Initialize SDK — reads AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET from env automatically
const amadeus = new Amadeus({
  clientId:     process.env.AMADEUS_CLIENT_ID     || '',
  clientSecret: process.env.AMADEUS_CLIENT_SECRET || '',
  // hostname: 'production', // Uncomment when going live
});

/**
 * Convert a city name to an IATA city code.
 * Amadeus APIs require IATA city codes (e.g., Delhi → DEL, Mumbai → BOM, Paris → PAR).
 */
const CITY_CODES: Record<string, string> = {
  delhi: 'DEL', 'new delhi': 'DEL',
  mumbai: 'BOM', bombay: 'BOM',
  bengaluru: 'BLR', bangalore: 'BLR',
  hyderabad: 'HYD',
  chennai: 'MAA', madras: 'MAA',
  kolkata: 'CCU', calcutta: 'CCU',
  goa: 'GOI',
  jaipur: 'JAI',
  ahmedabad: 'AMD',
  pune: 'PNQ',
  kochi: 'COK', cochin: 'COK',
  // International
  paris: 'PAR',
  london: 'LON',
  'new york': 'NYC',
  dubai: 'DXB',
  singapore: 'SIN',
  bangkok: 'BKK',
  tokyo: 'TYO',
};

export function getCityCode(cityName: string): string {
  const key = cityName.toLowerCase().trim();
  return CITY_CODES[key] || cityName.toUpperCase().slice(0, 3);
}

/**
 * Search hotels by city and get their offers (rooms + prices).
 * Flow: Hotel List API → Hotel Offers Search API
 */
export const searchAmadeusHotels = async (params: {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms?: number;
}) => {
  if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
    throw new Error('AMADEUS_KEYS_MISSING');
  }

  const cityCode = getCityCode(params.city);

  // Step 1: Get list of hotel IDs in the city
  const hotelListRes = await amadeus.referenceData.locations.hotels.byCity.get({
    cityCode,
  });

  if (!hotelListRes.data || hotelListRes.data.length === 0) {
    return [];
  }

  // Take up to 20 hotels (API limit per request)
  const hotelIds = hotelListRes.data
    .slice(0, 20)
    .map((h: any) => h.hotelId)
    .join(',');

  // Step 2: Get available offers for those hotels
  const offersRes = await amadeus.shopping.hotelOffersSearch.get({
    hotelIds,
    adults: String(params.adults || 1),
    checkInDate:  params.checkIn,
    checkOutDate: params.checkOut,
    roomQuantity: String(params.rooms || 1),
    currency: 'USD',
    bestRateOnly: 'true',
  });

  if (!offersRes.data || offersRes.data.length === 0) {
    return [];
  }

  // Normalize the Amadeus response to match our app's hotel shape
  return offersRes.data.map((entry: any) => {
    const hotel  = entry.hotel;
    const offer  = entry.offers?.[0];
    const price  = offer?.price?.total ? Number(offer.price.total) : 0;
    const priceINR = Math.round(price * 85); // USD → INR conversion

    return {
      // Use Amadeus hotel ID with prefix so we can identify it on the frontend
      id:            `amadeus_${hotel.hotelId}`,
      amadeusHotelId: hotel.hotelId,
      amadeusOfferId: offer?.id || null,
      name:          hotel.name,
      city:          params.city,
      address:       hotel.address?.lines?.join(', ') || '',
      rating:        hotel.rating ? Number(hotel.rating) : 4.0,
      starRating:    hotel.rating ? Math.round(Number(hotel.rating)) : 4,
      reviewCount:   0,
      latitude:      hotel.latitude,
      longitude:     hotel.longitude,
      chainCode:     hotel.chainCode,
      images:        [], // Amadeus doesn't provide images in search; kept empty for now
      amenities:     hotel.amenities || [],
      minPrice:      priceINR,
      source:        'amadeus',
      rooms: offer ? [
        {
          id:             offer.id,
          type:           offer.room?.type || offer.room?.typeEstimated?.category || 'Room',
          description:    offer.room?.description?.text || '',
          pricePerNight:  priceINR,
          maxOccupancy:   Number(params.adults || 2),
          available:      true,
          amadeusOfferId: offer.id,
          checkInDate:    params.checkIn,
          checkOutDate:   params.checkOut,
        }
      ] : [],
    };
  });
};

/**
 * Verify and reprice a specific offer before booking (price confirmation step).
 */
export const verifyAmadeusOffer = async (offerId: string) => {
  const res = await amadeus.shopping.hotelOfferSearch(offerId).get();
  return res.data;
};

/**
 * Create a real hotel booking via Amadeus.
 * Called AFTER payment is captured successfully.
 * Returns the Amadeus booking reference (PNR).
 */
export const createAmadeusBooking = async (params: {
  offerId:   string;
  guests:    { firstName: string; lastName: string; email: string; phone?: string }[];
  paymentRef: string; // Our PayPal order ID as payment reference
}) => {
  const { offerId, guests, paymentRef } = params;

  const guest = guests[0];
  const nameParts = guest.firstName.trim().split(' ');
  const firstName = nameParts[0];
  const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (guest.lastName || 'GUEST');

  const res = await amadeus.booking.hotelOrders.post(
    JSON.stringify({
      data: {
        offerId,
        guests: [
          {
            name: {
              title: 'MR',
              firstName: firstName.toUpperCase(),
              lastName:  lastName.toUpperCase(),
            },
            contact: {
              phone:     guest.phone || '+911234567890',
              email:     guest.email,
            },
          },
        ],
        payment: {
          method: 'CREDIT_CARD',
          paymentCard: {
            // In test mode, Amadeus accepts these dummy test card details
            vendorCode:      'VI',
            cardNumber:      '4111111111111111',
            expiryDate:      '2026-01',
          },
        },
      },
    })
  );

  return res.data;
};
