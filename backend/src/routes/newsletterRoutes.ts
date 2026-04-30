import { Router, Request, Response } from 'express';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber';

const router = Router();

router.post('/subscribe', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  try {
    const existing = await NewsletterSubscriber.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'This email is already subscribed.' });
    }

    await NewsletterSubscriber.create({ email });
    return res.status(201).json({ message: 'Successfully subscribed! Check your inbox for your ₹500 coupon.' });
  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

export default router;
