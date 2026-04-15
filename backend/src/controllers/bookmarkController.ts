import { Request, Response } from 'express';
import { Bookmark, Hotel } from '../models';

export const toggleBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { hotelId } = req.body;

    const existing = await Bookmark.findOne({ where: { userId, hotelId } });
    if (existing) {
      await existing.destroy();
      res.status(200).json({ message: 'Bookmark removed', bookmarked: false });
    } else {
      await Bookmark.create({ userId, hotelId });
      res.status(201).json({ message: 'Hotel bookmarked', bookmarked: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getUserBookmarks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const bookmarks = await Bookmark.findAll({
      where: { userId },
      include: [{ model: Hotel, as: 'hotel' }],
    });

    const enriched = bookmarks.map((b: any) => {
      const bJson = b.toJSON();
      if (bJson.hotel) {
        bJson.hotel.images = JSON.parse(bJson.hotel.images || '[]');
        bJson.hotel.amenities = JSON.parse(bJson.hotel.amenities || '[]');
      }
      return bJson;
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
