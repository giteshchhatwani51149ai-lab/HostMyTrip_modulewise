import { Router } from 'express';
import {
  createBooking, getUserBookings, cancelBooking, getAllBookings, adminCreateBooking, confirmPayment, failPayment,
  getCorporatePendingApprovals, approveCorporateBooking, rejectCorporateBooking, getBookingById,
  getMemberBookings, deleteMember,
} from '../controllers/bookingController';
import { authenticate, requireAdmin, requireRoles } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createBooking);
router.get('/my', authenticate, getUserBookings);
router.put('/:id/cancel', authenticate, cancelBooking);
router.get('/all', authenticate, requireAdmin, getAllBookings);
router.post('/admin/create', authenticate, requireAdmin, adminCreateBooking);
router.get('/corporate/pending-approvals', authenticate, requireRoles(['corporate_admin']), getCorporatePendingApprovals);
router.get('/corporate/member/:memberId', authenticate, requireRoles(['corporate_admin']), getMemberBookings);
router.delete('/corporate/member/:memberId', authenticate, requireRoles(['corporate_admin']), deleteMember);
router.post('/:id/approve', authenticate, requireRoles(['corporate_admin']), approveCorporateBooking);
router.post('/:id/reject', authenticate, requireRoles(['corporate_admin']), rejectCorporateBooking);
router.get('/:id', authenticate, getBookingById);
router.post('/:id/confirm-payment', authenticate, confirmPayment);
router.post('/:id/fail-payment', authenticate, failPayment);

export default router;
