import { Router } from 'express';
import { getSettings, updateSetting } from '../controllers/settingController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public: GET settings (to apply correctly on frontend if needed, though backend applies margins)
router.get('/', getSettings);

// Admin: UPDATE setting
router.put('/:key', authenticate, updateSetting);

export default router;
