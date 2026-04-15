import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { User } from '../models/User';

// Test ethereal email configuration for Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'demouser@ethereal.email', // Will be generated dynamically if needed, but for simplicity we log the URL
    pass: 'demopass',
  },
});

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email is already registered.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      email,
      password: hashedPassword,
      role: role || 'customer',
      verificationToken,
    });

    // Generate Ethereal account for testing
    const testAccount = await nodemailer.createTestAccount();
    const mailTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${verificationToken}`;
    
    let info = await mailTransporter.sendMail({
      from: '"HostMyTrip" <no-reply@hostmytrip.com>',
      to: email,
      subject: 'Verify Your Email',
      html: `<p>Welcome to HostMyTrip!</p><p>Please verify your email by clicking the link below:</p><a href="${verifyUrl}">Verify Email</a>`,
    });

    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

    res.status(201).json({ 
      message: 'Registration successful. Please check your email to verify your account.',
      previewUrl: nodemailer.getTestMessageUrl(info) // handy for the user to be able to click directly in development
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    if (!token) {
      res.status(400).json({ message: 'Missing token' });
      return;
    }

    const user = await User.findOne({ where: { verificationToken: token as string } });
    if (!user) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: 'Email successfully verified. You can now login.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(400).json({ message: 'Invalid email or password' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ message: 'Please verify your email before logging in.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid email or password' });
      return;
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: payload
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
