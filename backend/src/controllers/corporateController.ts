import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Booking, Corporate, User } from '../models';

export const createCorporate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, taxId, creditLimit, status, canBookHotels = true, canBookFlights = false, adminEmail, adminPassword } = req.body;
    if (!name || !taxId || !adminEmail || !adminPassword) {
      res.status(400).json({ message: 'name, taxId, adminEmail and adminPassword are required' });
      return;
    }

    const existingTax = await Corporate.findOne({ where: { taxId } });
    if (existingTax) {
      res.status(400).json({ message: 'Corporate with this taxId already exists' });
      return;
    }
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (existingAdmin) {
      res.status(400).json({ message: 'Admin email already exists' });
      return;
    }

    const corporate = await Corporate.create({
      name,
      taxId,
      creditLimit: Number(creditLimit || 0),
      creditUsed: 0,
      status: status || 'active',
    });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPassword, salt);
    const corporateAdmin = await User.create({
      email: adminEmail,
      password: hash,
      role: 'corporate_admin',
      corporateId: corporate.id,
      canBookHotels: !!canBookHotels,
      canBookFlights: !!canBookFlights,
      isVerified: true,
      verificationToken: null,
    });

    res.status(201).json({ corporate, corporateAdmin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateCorporateCredit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      creditLimit,
      status,
      flightMarginPercent,
      flightMarginAmount,
      hotelMarginPercent,
      hotelMarginAmount,
    } = req.body;
    const corporate = await Corporate.findByPk(Number(id));
    if (!corporate) {
      res.status(404).json({ message: 'Corporate not found' });
      return;
    }

    // Update credit and status
    if (creditLimit !== undefined) corporate.creditLimit = Number(creditLimit);
    if (status !== undefined) corporate.status = status;

    // Update margin settings
    if (flightMarginPercent !== undefined) {
      corporate.flightMarginPercent = flightMarginPercent ? Number(flightMarginPercent) : null;
    }
    if (flightMarginAmount !== undefined) {
      corporate.flightMarginAmount = flightMarginAmount ? Number(flightMarginAmount) : null;
    }
    if (hotelMarginPercent !== undefined) {
      corporate.hotelMarginPercent = hotelMarginPercent ? Number(hotelMarginPercent) : null;
    }
    if (hotelMarginAmount !== undefined) {
      corporate.hotelMarginAmount = hotelMarginAmount ? Number(hotelMarginAmount) : null;
    }

    await corporate.save();
    res.status(200).json(corporate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const listCorporates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const corporates = await Corporate.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json(corporates.map((c: any) => ({
      ...c.toJSON(),
      remainingCredit: Number(c.creditLimit) - Number(c.creditUsed),
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const createCorporateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const actorDb = await User.findByPk(actor.id);
    if (!actorDb || !actorDb.corporateId) {
      res.status(403).json({ message: 'Corporate context not found' });
      return;
    }
    const { email, password, role = 'corporate_employee', canBookHotels = true, canBookFlights = false } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'email and password are required' });
      return;
    }
    if (!['corporate_admin', 'corporate_employee'].includes(role)) {
      res.status(400).json({ message: 'Invalid corporate role' });
      return;
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      res.status(400).json({ message: 'Email already exists' });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await User.create({
      email,
      password: hash,
      role,
      corporateId: actorDb.corporateId,
      canBookHotels: !!canBookHotels,
      canBookFlights: !!canBookFlights,
      isVerified: true,
      verificationToken: null,
    });
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const listCorporateUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const actorDb = await User.findByPk(actor.id);
    if (!actorDb || !actorDb.corporateId) {
      res.status(403).json({ message: 'Corporate context not found' });
      return;
    }
    const users = await User.findAll({
      where: { corporateId: actorDb.corporateId },
      attributes: ['id', 'email', 'role', 'canBookHotels', 'canBookFlights', 'corporateId', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getCorporateDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const actorDb = await User.findByPk(actor.id);
    if (!actorDb || !actorDb.corporateId) {
      res.status(403).json({ message: 'Corporate context not found' });
      return;
    }
    const corporate = await Corporate.findByPk(actorDb.corporateId);
    if (!corporate) {
      res.status(404).json({ message: 'Corporate not found' });
      return;
    }
    const bookings = await Booking.count({ where: { corporateId: corporate.id } });
    const pendingApprovals = await Booking.count({ where: { corporateId: corporate.id, approvalStatus: 'pending' } });
    res.status(200).json({
      corporate,
      remainingCredit: Number(corporate.creditLimit) - Number(corporate.creditUsed),
      bookings,
      pendingApprovals,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
