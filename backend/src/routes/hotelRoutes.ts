import { Router } from 'express';
import { searchHotels, getHotelById, getAllHotels, searchHotelsAmadeus } from '../controllers/hotelController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getAllHotels);
router.get('/search', searchHotels);
router.get('/amadeus/search', authenticate, searchHotelsAmadeus);
router.get('/:id', getHotelById);

export default router;
