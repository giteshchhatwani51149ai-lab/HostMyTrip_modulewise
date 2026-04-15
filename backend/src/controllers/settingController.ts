import { Request, Response } from 'express';
import { Setting } from '../models';

export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await Setting.findAll();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.val;
      return acc;
    }, {} as Record<string, string>);
    
    // Default margin if not set
    if (!settingsMap['hotel_margin_percent']) {
      settingsMap['hotel_margin_percent'] = '10'; // Default 10%
    }
    
    res.status(200).json(settingsMap);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    
    const { key } = req.params;
    const { val } = req.body;
    
    let setting = await Setting.findByPk(String(key));
    if (!setting) {
      setting = await Setting.create({ key, val: String(val) });
    } else {
      setting.val = String(val);
      await setting.save();
    }
    
    res.status(200).json({ message: 'Setting updated successfully', setting });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
