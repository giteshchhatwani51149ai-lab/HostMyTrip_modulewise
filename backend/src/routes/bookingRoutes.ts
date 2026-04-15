import { Router } from 'express';
import { createBooking, getUserBookings, cancelBooking, getAllBookings, adminCreateBooking, confirmPayment, failPayment } from '../controllers/bookingController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createBooking);
router.get('/my', authenticate, getUserBookings);
router.put('/:id/cancel', authenticate, cancelBooking);
router.get('/all', authenticate, requireAdmin, getAllBookings);
router.post('/admin/create', authenticate, requireAdmin, adminCreateBooking);
router.post('/:id/confirm-payment', authenticate, confirmPayment);
router.post('/:id/fail-payment', authenticate, failPayment);

export default router;
