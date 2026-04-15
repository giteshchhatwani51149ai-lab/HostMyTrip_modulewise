import { Request, Response } from 'express';
import { Review, Booking, Hotel } from '../models';
import { User } from '../models/User';

export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { bookingId, rating, comment } = req.body;

    const booking = await Booking.findOne({ where: { id: bookingId, userId, status: 'confirmed' } });
    if (!booking) {
      res.status(403).json({ message: 'You can only review hotels you have booked through HostMyTrip.' });
      return;
    }

    const existingReview = await Review.findOne({ where: { bookingId } });
    if (existingReview) {
      res.status(400).json({ message: 'You have already submitted a review for this booking.' });
      return;
    }

    const review = await Review.create({ userId, hotelId: booking.hotelId, bookingId, rating, comment });

    // Recalculate average rating
    const allReviews = await Review.findAll({ where: { hotelId: booking.hotelId } });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Hotel.update(
      { rating: parseFloat(avgRating.toFixed(1)), reviewCount: allReviews.length },
      { where: { id: booking.hotelId } }
    );

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getHotelReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelId } = req.params;
    const reviews = await Review.findAll({
      where: { hotelId: Number(hotelId) },
      include: [{ model: User, as: 'user', attributes: ['email'] }],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
