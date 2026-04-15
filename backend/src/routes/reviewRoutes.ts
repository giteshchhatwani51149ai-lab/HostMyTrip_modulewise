import { Router } from 'express';
import { createReview, getHotelReviews } from '../controllers/reviewController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createReview);
router.get('/hotel/:hotelId', getHotelReviews);

export default router;
