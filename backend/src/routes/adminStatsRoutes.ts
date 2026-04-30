import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Booking } from '../models/Booking';
import { User } from '../models/User';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/* ───────────────────────────────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────────────────────────────── */

/** Classify a booking row as 'flight' | 'hotel' | 'package'. */
function classify(b: any): 'flight' | 'hotel' | 'package' {
  // Hotel: roomId/hotelId set, OR passengers JSON snapshot contains hotel keys
  if (b.roomId || b.hotelId) return 'hotel';
  if (typeof b.passengers === 'string' && /"hotelName"|"hotelExternalId"/i.test(b.passengers)) return 'hotel';
  // Flight: airline or departureDate present, or passengers is a JSON array
  if (b.airline || b.departureDate) return 'flight';
  if (typeof b.passengers === 'string' && b.passengers.trim().startsWith('[')) return 'flight';
  return 'package';
}

const startOfDayISO = (d: Date) => {
  const c = new Date(d); c.setHours(0, 0, 0, 0); return c;
};

const pct = (curr: number, prev: number): number => {
  if (!prev) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
};

/* ───────────────────────────────────────────────────────────────────────
   GET /api/admin/stats
   ─────────────────────────────────────────────────────────────────────── */
router.get('/stats', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const now        = new Date();
    const today      = startOfDayISO(now);
    const yesterday  = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const last30     = new Date(today); last30.setDate(last30.getDate() - 29); // inclusive 30 days
    const monthAgo   = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);

    /* ── Pull last-30-days bookings once (only fields needed) ── */
    const recentBookings = await Booking.findAll({
      where: { createdAt: { [Op.gte]: last30 } },
      attributes: [
        'id', 'bookingReference', 'guestName', 'guestEmail',
        'roomId', 'hotelId', 'airline', 'departureDate', 'destination',
        'passengers', 'paidAmount', 'totalAmount', 'status', 'createdAt',
      ],
      order: [['createdAt', 'DESC']],
      raw: true,
    });

    /* ── Today vs Yesterday ──────────────────────────── */
    const todayBookings     = recentBookings.filter((b: any) => new Date(b.createdAt) >= today).length;
    const yesterdayBookings = recentBookings.filter((b: any) => {
      const c = new Date(b.createdAt); return c >= yesterday && c < today;
    }).length;

    const todayRevenue     = recentBookings
      .filter((b: any) => new Date(b.createdAt) >= today && b.status !== 'cancelled')
      .reduce((s: number, b: any) => s + Number(b.paidAmount || 0), 0);
    const yesterdayRevenue = recentBookings
      .filter((b: any) => {
        const c = new Date(b.createdAt); return c >= yesterday && c < today && b.status !== 'cancelled';
      })
      .reduce((s: number, b: any) => s + Number(b.paidAmount || 0), 0);

    /* ── Pending confirmations (all-time) ────────────── */
    const pendingConfirmations = await Booking.count({
      where: { status: 'pending' },
    });

    /* ── Active users (logged in or signed up in last 30d) ── */
    let activeUsers = 0, activeUsersPrev = 0;
    try {
      activeUsers     = await User.count({ where: { createdAt: { [Op.gte]: last30 } } });
      activeUsersPrev = await User.count({ where: { createdAt: { [Op.gte]: monthAgo, [Op.lt]: last30 } } });
    } catch { /* User model may not exist in some envs */ }

    /* ── Daily revenue series (30 days) ───────────────── */
    const revenueDaily: { date: string; revenue: number; bookings: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d  = new Date(last30); d.setDate(d.getDate() + i);
      const d2 = new Date(d);      d2.setDate(d2.getDate() + 1);
      const dayBookings = recentBookings.filter((b: any) => {
        const c = new Date(b.createdAt); return c >= d && c < d2 && b.status !== 'cancelled';
      });
      revenueDaily.push({
        date:     d.toISOString().split('T')[0],
        revenue:  dayBookings.reduce((s: number, b: any) => s + Number(b.paidAmount || 0), 0),
        bookings: dayBookings.length,
      });
    }

    /* ── Bookings by type (last 30d) ──────────────────── */
    const typeCounts = { flight: 0, hotel: 0, package: 0 };
    recentBookings.forEach((b: any) => { typeCounts[classify(b)]++; });
    const totalTyped = typeCounts.flight + typeCounts.hotel + typeCounts.package || 1;
    const bookingsByType = [
      { type: 'Flights',  count: typeCounts.flight,  pct: Math.round(typeCounts.flight  / totalTyped * 100) },
      { type: 'Hotels',   count: typeCounts.hotel,   pct: Math.round(typeCounts.hotel   / totalTyped * 100) },
      { type: 'Packages', count: typeCounts.package, pct: Math.round(typeCounts.package / totalTyped * 100) },
    ];

    /* ── Top destinations (last 30d) ──────────────────── */
    const destMap = new Map<string, number>();
    recentBookings.forEach((b: any) => {
      const dest = (b.destination || '').trim();
      if (!dest) return;
      destMap.set(dest, (destMap.get(dest) || 0) + 1);
    });
    const topDestinations = Array.from(destMap.entries())
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    /* ── Recent 10 bookings (formatted) ───────────────── */
    const recent = recentBookings.slice(0, 10).map((b: any) => ({
      id:               b.id,
      bookingReference: b.bookingReference,
      customer:         b.guestName || b.guestEmail,
      customerEmail:    b.guestEmail,
      type:             classify(b),
      amount:           Number(b.paidAmount || b.totalAmount || 0),
      status:           b.status,
      date:             b.createdAt,
    }));

    res.json({
      today: {
        bookings:        todayBookings,
        bookingsTrend:   pct(todayBookings, yesterdayBookings),
        revenue:         todayRevenue,
        revenueTrend:    pct(todayRevenue, yesterdayRevenue),
      },
      pendingConfirmations,
      activeUsers: {
        count:           activeUsers,
        monthlyGrowth:   pct(activeUsers, activeUsersPrev),
      },
      revenueDaily,
      bookingsByType,
      topDestinations,
      recentBookings: recent,
    });
  } catch (err: any) {
    console.error('[admin/stats] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to load stats', detail: err?.message });
  }
});

export default router;
