import { Router } from 'express';
import { toggleBookmark, getUserBookmarks } from '../controllers/bookmarkController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/toggle', authenticate, toggleBookmark);
router.get('/my', authenticate, getUserBookmarks);

export default router;
