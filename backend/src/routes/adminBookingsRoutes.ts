import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Booking, Hotel, Room, Corporate, User } from '../models';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/* ── Display field resolver (mirrors bookingController) ─────────────── */
function deriveDisplay(bj: any) {
  if (bj.hotel?.name) return { type: 'hotel' as const, hotelName: bj.hotel.name, roomName: bj.room?.type || 'Room', city: bj.hotel.city || '' };

  let snap: any = null;
  if (bj.passengers) {
    try { snap = typeof bj.passengers === 'string' ? JSON.parse(bj.passengers) : bj.passengers; } catch { /* */ }
  }
  if (snap && !Array.isArray(snap) && (snap.hotelName || snap.hotelExternalId)) {
    return { type: 'hotel' as const, hotelName: snap.hotelName || bj.destination || 'Hotel', roomName: snap.roomName || bj.airline || 'Room', city: snap.hotelCity || bj.origin || '' };
  }
  if (bj.airline || bj.departureDate || (snap && Array.isArray(snap))) {
    const route = [bj.origin, bj.destination].filter(Boolean).join(' → ');
    return { type: 'flight' as const, hotelName: bj.airline ? `${bj.airline}${route ? ` · ${route}` : ''}` : (route || 'Flight'), roomName: 'Flight', city: bj.destination || '' };
  }
  return { type: 'package' as const, hotelName: bj.destination || 'Package', roomName: bj.airline || '—', city: bj.origin || '' };
}

/* ────────────────────────────────────────────────────────────────────
   GET /api/admin/bookings
   Query: page, pageSize, status, type, dateFrom, dateTo, q (search)
   ──────────────────────────────────────────────────────────────────── */
router.get('/bookings', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const page     = Math.max(1, parseInt(String(req.query.page     || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '25'), 10)));
    const status   = String(req.query.status || '').trim();
    const type     = String(req.query.type   || '').trim().toLowerCase();
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo   = String(req.query.dateTo   || '').trim();
    const q        = String(req.query.q || '').trim();

    /* ── Build where clause ─────────────────────────── */
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom + 'T00:00:00');
      if (dateTo) {
        const d = new Date(dateTo + 'T23:59:59');
        where.createdAt[Op.lte] = d;
      }
    }
    if (q) {
      where[Op.or] = [
        { bookingReference: { [Op.like]: `%${q}%` } },
        { guestName:        { [Op.like]: `%${q}%` } },
        { guestEmail:       { [Op.like]: `%${q}%` } },
        { guestPhone:       { [Op.like]: `%${q}%` } },
      ];
    }

    /* ── Light includes: only fields we render in the table ── */
    const include = [
      { model: Room,      as: 'room',          attributes: ['id', 'type', 'pricePerNight'] },
      { model: Hotel,     as: 'hotel',         attributes: ['id', 'name', 'city', 'rating'] },
      { model: Corporate, as: 'corporate',     attributes: ['id', 'name'] },
      { model: User,      as: 'bookedByUser',  attributes: ['id', 'email', 'role'] },
    ];

    const hasTypeFilter = type && type !== 'all';

    if (!hasTypeFilter) {
      /* Fast path: SQL pagination (O(pageSize) work) */
      const { rows, count } = await Booking.findAndCountAll({
        where,
        include,
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        distinct: true,
        subQuery: false,
      });
      const items = rows.map((b: any) => {
        const bj = b.toJSON();
        const d  = deriveDisplay(bj);
        return { ...bj, ...d, displayHotelName: d.hotelName, displayRoomType: d.roomName, displayCity: d.city, bookingType: d.type };
      });
      res.json({ items, page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
      return;
    }

    /* Slow path: type is a derived field, must enrich + filter in memory */
    const all = await Booking.findAll({ where, include, order: [['createdAt', 'DESC']] });
    const enrichedAll = all.map((b: any) => {
      const bj = b.toJSON();
      const d  = deriveDisplay(bj);
      return { ...bj, ...d, displayHotelName: d.hotelName, displayRoomType: d.roomName, displayCity: d.city, bookingType: d.type };
    });
    const filteredByType = enrichedAll.filter(b => b.bookingType === type);
    const total = filteredByType.length;
    const start = (page - 1) * pageSize;
    const items = filteredByType.slice(start, start + pageSize);

    res.json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err: any) {
    console.error('[admin/bookings] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to load bookings', detail: err?.message });
  }
});

/* ────────────────────────────────────────────────────────────────────
   GET /api/admin/bookings/pending-collections
   MUST be defined BEFORE /bookings/:id (Express matches in order)
   ──────────────────────────────────────────────────────────────────── */
router.get('/bookings/pending-collections', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const bookings = await Booking.findAll({
      where: {
        bookingSource: 'admin',
        paymentStatus: 'pending',
        status: { [Op.ne]: 'cancelled' },
      } as any,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'bookedByUser', attributes: ['id', 'email', 'role'] },
      ],
    });
    const total = bookings.reduce((sum, b: any) => sum + Number(b.totalAmount || 0), 0);
    res.json({ bookings, totalPending: total, count: bookings.length });
  } catch (err: any) {
    console.error('[admin/pending-collections] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to fetch pending collections', detail: err?.message });
  }
});

/* ────────────────────────────────────────────────────────────────────
   GET /api/admin/bookings/:id
   Full booking detail + previous-bookings count + activity timeline
   ──────────────────────────────────────────────────────────────────── */
router.get('/bookings/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const booking: any = await Booking.findByPk(id, {
      include: [
        { model: Room,      as: 'room' },
        { model: Hotel,     as: 'hotel',     attributes: ['id', 'name', 'city', 'rating', 'address'] },
        { model: Corporate, as: 'corporate', attributes: ['id', 'name'] },
        { model: User,      as: 'bookedByUser', attributes: ['id', 'email', 'role'] },
      ],
    });
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }

    const bj = booking.toJSON();
    const d  = deriveDisplay(bj);

    /* Previous bookings for the same customer email */
    let prevCount = 0;
    if (bj.guestEmail) {
      prevCount = await Booking.count({ where: { guestEmail: bj.guestEmail, id: { [Op.ne]: id } } });
    }

    /* Parse passenger / room snapshot */
    let snapshot: any = null;
    if (bj.passengers) {
      try { snapshot = typeof bj.passengers === 'string' ? JSON.parse(bj.passengers) : bj.passengers; }
      catch { snapshot = bj.passengers; }
    }

    /* Parse internal notes */
    let notes: any[] = [];
    if (bj.internalNotes) {
      try { notes = JSON.parse(bj.internalNotes); if (!Array.isArray(notes)) notes = []; }
      catch { notes = []; }
    }

    /* Synthesize activity timeline from booking fields */
    const timeline: { event: string; at: string; meta?: string }[] = [];
    timeline.push({ event: 'Booking created', at: bj.createdAt });
    if (bj.paymentStatus === 'paid' || bj.paymentStatus === 'partial') {
      timeline.push({ event: 'Payment initiated', at: bj.createdAt });
      timeline.push({
        event: bj.paymentStatus === 'paid' ? 'Payment successful' : 'Partial payment received',
        at: bj.updatedAt,
        meta: bj.stripePaymentIntentId || undefined,
      });
    } else if (bj.paymentStatus === 'failed') {
      timeline.push({ event: 'Payment failed', at: bj.updatedAt });
    }
    if (bj.status === 'confirmed') {
      timeline.push({ event: 'Booking confirmed · Confirmation email sent', at: bj.updatedAt });
    }
    if (bj.status === 'cancelled') {
      timeline.push({
        event: 'Booking cancelled',
        at: bj.cancelledAt || bj.updatedAt,
        meta: bj.cancelReason || undefined,
      });
    }

    res.json({
      ...bj,
      ...d,
      displayHotelName: d.hotelName,
      displayRoomType:  d.roomName,
      displayCity:      d.city,
      bookingType:      d.type,
      snapshot,
      internalNotes:    notes,
      previousBookingsCount: prevCount,
      timeline,
    });
  } catch (err: any) {
    console.error('[admin/bookings/:id] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to load booking', detail: err?.message });
  }
});

/* ────────────────────────────────────────────────────────────────────
   PATCH /api/admin/bookings/:id
   Partial update — guestName / guestEmail / guestPhone / status / etc
   ──────────────────────────────────────────────────────────────────── */
router.patch('/bookings/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const booking = await Booking.findByPk(id);
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }

    const allowed = ['guestName', 'guestEmail', 'guestPhone', 'status', 'paymentStatus', 'totalAmount', 'paidAmount'];
    const patch: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];

    await booking.update(patch);
    res.json({ message: 'Booking updated', booking });
  } catch (err: any) {
    console.error('[admin/bookings/:id PATCH] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to update booking', detail: err?.message });
  }
});

/* ────────────────────────────────────────────────────────────────────
   POST /api/admin/bookings/:id/cancel
   ──────────────────────────────────────────────────────────────────── */
router.post('/bookings/:id/cancel', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const reason = String(req.body?.reason || '').slice(0, 500);
    const booking = await Booking.findByPk(id);
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }
    if (booking.status === 'cancelled') { res.status(400).json({ message: 'Booking already cancelled' }); return; }

    await booking.update({
      status: 'cancelled',
      cancelReason: reason || null,
      cancelledAt: new Date(),
    });
    res.json({ message: 'Booking cancelled', booking });
  } catch (err: any) {
    console.error('[admin/cancel] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

/* ────────────────────────────────────────────────────────────────────
   POST /api/admin/bookings/:id/notes
   Append an internal admin note
   ──────────────────────────────────────────────────────────────────── */
router.post('/bookings/:id/notes', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const text = String(req.body?.text || '').trim();
    if (!text) { res.status(400).json({ message: 'Note text is required' }); return; }

    const booking = await Booking.findByPk(id);
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }

    const u = (req as any).user;
    let notes: any[] = [];
    if (booking.internalNotes) {
      try { notes = JSON.parse(booking.internalNotes); if (!Array.isArray(notes)) notes = []; }
      catch { notes = []; }
    }
    notes.push({
      text,
      author: u?.email || 'admin',
      authorRole: u?.role || 'admin',
      at: new Date().toISOString(),
    });

    await booking.update({ internalNotes: JSON.stringify(notes) });
    res.json({ message: 'Note added', notes });
  } catch (err: any) {
    console.error('[admin/notes] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to add note' });
  }
});

/* ────────────────────────────────────────────────────────────────────
   POST /api/admin/bookings/:id/confirm
   Admin manually confirms a pending booking
   ──────────────────────────────────────────────────────────────────── */
router.post('/bookings/:id/confirm', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const booking = await Booking.findByPk(id);
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }
    if (booking.status === 'cancelled') { res.status(400).json({ message: 'Cannot confirm a cancelled booking' }); return; }

    await booking.update({ status: 'confirmed' });
    res.json({ message: 'Booking confirmed', booking });
  } catch (err: any) {
    console.error('[admin/confirm] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to confirm booking' });
  }
});

/* ────────────────────────────────────────────────────────────────────
   POST /api/admin/bookings/:id/collect-payment
   Mark cash payment as collected from customer for an admin booking
   Body: { amount, method, notes }
   ──────────────────────────────────────────────────────────────────── */
router.post('/bookings/:id/collect-payment', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { amount, method = 'cash', notes = '' } = req.body || {};

    const booking = await Booking.findByPk(id);
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }
    if (booking.bookingSource !== 'admin') {
      res.status(400).json({ message: 'Only admin bookings support cash collection' });
      return;
    }
    if (booking.paymentStatus === 'paid') {
      res.status(400).json({ message: 'Payment already collected' });
      return;
    }

    const collected = Number(amount) || Number(booking.totalAmount);
    const newPaid = Number(booking.paidAmount || 0) + collected;
    const totalAmt = Number(booking.totalAmount);
    const newStatus = newPaid >= totalAmt ? 'paid' : 'partial';

    await booking.update({
      paidAmount: newPaid,
      paymentStatus: newStatus,
      paymentGateway: method,
      paymentTxnId: `CASH-${Date.now()}${notes ? ` | ${notes.slice(0, 100)}` : ''}`,
    });

    res.json({
      message: `Payment of ₹${collected} marked as collected`,
      booking,
    });
  } catch (err: any) {
    console.error('[admin/collect-payment] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to mark payment collected' });
  }
});

/* ────────────────────────────────────────────────────────────────────
   POST /api/admin/bookings/:id/resend-email
   Stub — would integrate with your mail service
   ──────────────────────────────────────────────────────────────────── */
router.post('/bookings/:id/resend-email', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const booking = await Booking.findByPk(id);
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }

    // TODO: integrate with mailer (Resend / SendGrid / SMTP)
    console.log(`[admin/resend-email] Would send confirmation for booking ${id} to ${booking.guestEmail}`);

    res.json({ message: `Confirmation email queued for ${booking.guestEmail}` });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to resend email' });
  }
});

/* ────────────────────────────────────────────────────────────────────
   GET /api/admin/bookings/:id/invoice
   Returns a basic HTML invoice (printable / save as PDF via browser)
   ──────────────────────────────────────────────────────────────────── */
router.get('/bookings/:id/invoice', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const booking: any = await Booking.findByPk(id, {
      include: [
        { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'city'] },
        { model: Room,  as: 'room' },
      ],
    });
    if (!booking) { res.status(404).send('Booking not found'); return; }

    const bj = booking.toJSON();
    const d  = deriveDisplay(bj);
    const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${bj.bookingReference || bj.id}</title>
<style>
  body { font-family: Inter, system-ui, Arial, sans-serif; max-width: 720px; margin: 32px auto; padding: 0 24px; color: #111; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f97316; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 24px; font-weight: 800; color: #f97316; }
  .meta  { text-align: right; font-size: 13px; color: #555; }
  h2 { font-size: 16px; margin: 24px 0 8px; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #eee; }
  th { background: #f9fafb; font-weight: 600; color: #555; }
  .total { text-align: right; font-size: 16px; font-weight: 700; color: #f97316; padding: 14px 8px; }
  .small { font-size: 11px; color: #777; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #e0f2fe; color: #075985; text-transform: capitalize; }
  @media print { body { margin: 0; padding: 16px; } .no-print { display: none; } }
</style></head>
<body>
  <div class="head">
    <div>
      <div class="brand">HostMyTrip</div>
      <div class="small">Tax Invoice</div>
    </div>
    <div class="meta">
      <div><strong>${bj.bookingReference || `#${bj.id}`}</strong></div>
      <div>Issued ${new Date(bj.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      <div class="badge">${d.type}</div>
    </div>
  </div>

  <h2>Customer</h2>
  <table>
    <tr><td>Name</td><td><strong>${bj.guestName || '—'}</strong></td></tr>
    <tr><td>Email</td><td>${bj.guestEmail || '—'}</td></tr>
    ${bj.guestPhone ? `<tr><td>Phone</td><td>${bj.guestPhone}</td></tr>` : ''}
  </table>

  <h2>${d.type === 'flight' ? 'Flight' : d.type === 'hotel' ? 'Stay' : 'Package'} details</h2>
  <table>
    ${d.type === 'hotel' ? `
      <tr><td>Hotel</td><td><strong>${d.hotelName}</strong></td></tr>
      <tr><td>Room</td><td>${d.roomName}</td></tr>
      <tr><td>City</td><td>${d.city}</td></tr>
      <tr><td>Check-in</td><td>${bj.checkIn}</td></tr>
      <tr><td>Check-out</td><td>${bj.checkOut}</td></tr>
      <tr><td>Guests</td><td>${bj.guests} · ${bj.rooms || 1} room(s)</td></tr>
    ` : `
      <tr><td>Carrier</td><td><strong>${bj.airline || '—'}</strong></td></tr>
      <tr><td>Route</td><td>${bj.origin || '—'} → ${bj.destination || '—'}</td></tr>
      <tr><td>Date</td><td>${bj.departureDate ? new Date(bj.departureDate).toLocaleDateString('en-IN') : (bj.checkIn || '—')}</td></tr>
    `}
  </table>

  <h2>Payment</h2>
  <table>
    <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
    <tr><td>Total amount</td><td style="text-align:right">${fmt(bj.totalAmount)}</td></tr>
    <tr><td>Paid</td><td style="text-align:right">${fmt(bj.paidAmount)}</td></tr>
    <tr><td class="total">Net payable</td><td class="total">${fmt(bj.totalAmount - bj.paidAmount)}</td></tr>
  </table>

  <p class="small">Status: <strong>${bj.status}</strong> · Payment: <strong>${bj.paymentStatus}</strong> · Currency: ${bj.currency || 'INR'}</p>
  <p class="small">Thank you for booking with HostMyTrip. For support, email support@hostmytrip.com.</p>

  <div class="no-print" style="margin-top:24px;text-align:center">
    <button onclick="window.print()" style="background:#f97316;color:#fff;border:0;padding:10px 22px;font-size:14px;border-radius:6px;cursor:pointer">Print / Save as PDF</button>
  </div>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    console.error('[admin/invoice] ERROR:', err?.message || err);
    res.status(500).send('Failed to generate invoice');
  }
});

export default router;
