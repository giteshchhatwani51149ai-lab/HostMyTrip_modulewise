import { Router } from 'express';
import { signup, verifyEmail, login } from '../controllers/authController';

const router = Router();

router.post('/signup', signup);
router.get('/verify', verifyEmail);
router.post('/login', login);

export default router;
