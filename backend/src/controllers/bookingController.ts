import { Request, Response } from 'express';
import { Booking, Room, Hotel, Review } from '../models';
import { createOrder, capturePayment } from '../utils/paypal';
import { createAmadeusBooking } from '../services/amadeusService';

function safeParseJson(val: any, fallback: any = []) {
  try { return typeof val === 'string' ? JSON.parse(val) : (val ?? fallback); } catch { return fallback; }
}

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const {
      roomId, hotelId, checkIn, checkOut, guests, paymentType,
      guestName, guestEmail, guestPhone,
      // Live hotel fields (no DB room)
      isLive, liveHotelName, liveRoomType, livePricePerNight, liveCity,
    } = req.body;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) { res.status(400).json({ message: 'Invalid check-in/check-out dates' }); return; }

    let totalAmount: number;
    let bookingRoomId: number;
    let bookingHotelId: number;

    if (isLive) {
      if (!livePricePerNight || !liveHotelName) {
        res.status(400).json({ message: 'Missing live hotel pricing info' }); return;
      }
      totalAmount = Number(livePricePerNight) * nights;
      bookingRoomId = null as any;
      bookingHotelId = null as any;
    } else {
      const room = await Room.findByPk(Number(roomId));
      if (!room) { res.status(404).json({ message: 'Room not found' }); return; }
      totalAmount = room.pricePerNight * nights;
      bookingRoomId = Number(roomId);
      bookingHotelId = Number(hotelId);
    }

    const chargeAmount = paymentType === 'partial' ? Math.round(totalAmount * 0.3) : totalAmount;

    // Create PayPal order – amount is in USD (PayPal sandbox standard)
    // Convert from INR to USD (approximate rate) for sandbox. In production with live keys,
    // PayPal supports INR natively if the merchant account is configured for it.
    const amountInUSD = (chargeAmount / 85).toFixed(2); // ~1 USD = 85 INR

    let paypalOrderId: string | null = null;
    try {
      const order = await createOrder(Number(amountInUSD));
      paypalOrderId = order.id;
    } catch (paypalError: any) {
      console.error('PayPal order creation failed:', paypalError?.response?.data || paypalError.message);
      res.status(500).json({ message: 'Payment gateway error. Could not create PayPal order.' });
      return;
    }

    const booking = await Booking.create({
      userId: userId || null,
      roomId: bookingRoomId,
      hotelId: bookingHotelId,
      checkIn,
      checkOut,
      guests,
      totalAmount,
      paidAmount: chargeAmount,
      paymentType,
      paymentStatus: 'pending',
      status: 'pending',
      stripePaymentIntentId: paypalOrderId, // reusing this column to store PayPal Order ID
      guestName,
      guestEmail,
      guestPhone: guestPhone || null,
      externalHotelName: isLive ? liveHotelName : null,
      externalRoomType: isLive ? liveRoomType : null,
      externalCity: isLive ? liveCity : null,
      amadeusOfferId: req.body.amadeusOfferId || null,
    });

    res.status(201).json({
      message: 'Booking initialized. Complete payment via PayPal.',
      booking,
      paypalOrderId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        { model: Room, as: 'room' },
        { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'city', 'images', 'rating'] },
        { model: Review, as: 'review' },
      ],
      order: [['createdAt', 'DESC']],
    });

    const enriched = (bookings as any[]).map((b) => {
      const bj = b.toJSON();
      if (bj.hotel) bj.hotel.images = safeParseJson(bj.hotel.images);
      if (bj.room) bj.room.images = safeParseJson(bj.room.images);
      bj.displayHotelName = bj.hotel?.name || bj.externalHotelName || 'Unknown Hotel';
      bj.displayRoomType  = bj.room?.type  || bj.externalRoomType  || 'Room';
      bj.displayCity      = bj.hotel?.city  || bj.externalCity      || '';
      bj.isLiveBooking    = !bj.hotel?.id && !!bj.externalHotelName;
      return bj;
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const userRole = (req as any).user?.role;

    const booking = await Booking.findByPk(Number(id));
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }

    if (booking.userId !== userId && userRole !== 'admin' && userRole !== 'employee') {
      res.status(403).json({ message: 'Unauthorized' }); return;
    }
    if (booking.status === 'cancelled') { res.status(400).json({ message: 'Already cancelled' }); return; }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Called by frontend after PayPal approves the payment.
 * Captures the payment server-side for security, then confirms the booking.
 */
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paypalOrderId } = req.body;

    const booking = await Booking.findByPk(Number(id));
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Capture payment on PayPal's servers to actually move the funds
    if (paypalOrderId) {
      try {
        const captureData = await capturePayment(paypalOrderId);
        const captureStatus = captureData?.status;
        if (captureStatus !== 'COMPLETED') {
          res.status(402).json({ message: `Payment capture not completed. Status: ${captureStatus}` });
          return;
        }
      } catch (captureErr: any) {
        console.error('PayPal capture failed:', captureErr?.response?.data || captureErr.message);
        res.status(500).json({ message: 'Failed to capture PayPal payment. Please contact support.' });
        return;
      }
    }

    // Update booking status after successful PayPal capture
    booking.status = 'confirmed';
    booking.paymentStatus = booking.paymentType === 'full' ? 'paid' : 'partial';

    // --- Amadeus Hotel Booking ---
    // If this booking came from an Amadeus offer, now create the real reservation
    if (booking.amadeusOfferId && process.env.AMADEUS_CLIENT_ID) {
      try {
        const nameParts = booking.guestName.trim().split(' ');
        const amadeusRes = await createAmadeusBooking({
          offerId:    booking.amadeusOfferId,
          guests: [{
            firstName: nameParts[0],
            lastName:  nameParts.slice(1).join(' ') || 'GUEST',
            email:     booking.guestEmail,
            phone:     booking.guestPhone || undefined,
          }],
          paymentRef: paypalOrderId || booking.stripePaymentIntentId || 'PAYPAL',
        });

        // Extract the Amadeus booking reference (PNR)
        const pnr = amadeusRes?.data?.id ||
                    amadeusRes?.data?.associatedRecords?.[0]?.reference ||
                    amadeusRes?.id ||
                    null;
        if (pnr) {
          booking.amadeusBookingRef = pnr;
          console.log(`✅ Amadeus booking created. PNR: ${pnr}`);
        }
      } catch (amadeusErr: any) {
        // Don't fail the booking if Amadeus call fails — payment is already captured
        console.error('⚠️ Amadeus booking attempt failed (payment already captured):', amadeusErr?.description || amadeusErr?.message);
        booking.amadeusBookingRef = 'MANUAL_CONFIRMATION_REQUIRED';
      }
    }

    await booking.save();
    res.status(200).json({ message: 'Payment captured and booking confirmed!', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const failPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(Number(id));
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    booking.status = 'failed';
    booking.paymentStatus = 'failed';
    await booking.save();

    res.status(200).json({ message: 'Payment marked as failed', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'employee') { res.status(403).json({ message: 'Forbidden' }); return; }

    const bookings = await Booking.findAll({
      include: [
        { model: Room, as: 'room' },
        { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'city', 'images', 'rating'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const enriched = (bookings as any[]).map((b) => {
      const bj = b.toJSON();
      if (bj.hotel?.images) bj.hotel.images = safeParseJson(bj.hotel.images);
      if (bj.room?.images) bj.room.images = safeParseJson(bj.room.images);
      bj.displayHotelName = bj.hotel?.name || bj.externalHotelName || 'Unknown Hotel';
      bj.displayRoomType  = bj.room?.type  || bj.externalRoomType  || 'Room';
      bj.displayCity      = bj.hotel?.city  || bj.externalCity      || '';
      bj.isLiveBooking    = !bj.hotel?.id && !!bj.externalHotelName;
      return bj;
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const adminCreateBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'employee') { res.status(403).json({ message: 'Forbidden' }); return; }
    req.body.userId = null;
    return createBooking(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
