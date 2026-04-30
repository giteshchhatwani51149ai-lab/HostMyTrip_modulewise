import { Router, Request, Response } from 'express';
import {
  createCorporate,
  createCorporateUser,
  getCorporateDashboard,
  listCorporateUsers,
  listCorporates,
  updateCorporateCredit,
} from '../controllers/corporateController';
import { authenticate, requireRoles, requireAdmin } from '../middleware/auth';
import { User, Booking, Corporate } from '../models';
import { Op } from 'sequelize';

const router = Router();

router.get('/', authenticate, requireRoles(['admin', 'employee']), listCorporates);
router.post('/', authenticate, requireRoles(['admin', 'employee']), createCorporate);
router.put('/:id', authenticate, requireRoles(['admin', 'employee']), updateCorporateCredit);

/* ── Admin: get all users + bookings for a specific corporate ── */
router.get('/:id/members', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const corpId = parseInt(String(req.params.id), 10);
    const corporate = await Corporate.findByPk(corpId);
    if (!corporate) { res.status(404).json({ message: 'Corporate not found' }); return; }

    const users = await User.findAll({
      where: { corporateId: corpId },
      attributes: ['id', 'email', 'name', 'role', 'canBookFlights', 'canBookHotels', 'createdAt'],
      order: [['role', 'ASC'], ['createdAt', 'ASC']],
    });

    const userIds = users.map((u: any) => u.id);
    const bookings = await Booking.findAll({
      where: {
        [Op.or]: [
          { userId: { [Op.in]: userIds } },
          { corporateId: corpId },
        ],
      },
      attributes: ['id', 'userId', 'bookingReference', 'status', 'approvalStatus', 'totalAmount', 'paidAmount', 'createdAt', 'airline', 'origin', 'destination', 'guestName'],
      order: [['createdAt', 'DESC']],
    });

    const usersWithBookings = users.map((u: any) => {
      const uj = u.toJSON();
      uj.bookings = bookings
        .filter((b: any) => b.userId === uj.id || (b.corporateId === corpId && b.userId === uj.id))
        .map((b: any) => b.toJSON ? b.toJSON() : b);
      uj.totalSpent = uj.bookings
        .filter((b: any) => b.status !== 'cancelled' && b.status !== 'failed')
        .reduce((s: number, b: any) => s + Number(b.totalAmount || 0), 0);
      return uj;
    });

    res.json({ corporate: corporate.toJSON(), members: usersWithBookings });
  } catch (err: any) {
    console.error('[admin/corporate/members]', err?.message);
    res.status(500).json({ message: 'Failed to load members' });
  }
});

/* ── Admin: record offline payment → reduce creditUsed ── */
router.post('/:id/record-payment', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const corpId = parseInt(String(req.params.id), 10);
    const { amount, note } = req.body;
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) { res.status(400).json({ message: 'amount must be a positive number' }); return; }

    const corp = await Corporate.findByPk(corpId);
    if (!corp) { res.status(404).json({ message: 'Corporate not found' }); return; }

    const newUsed = Math.max(0, Number(corp.creditUsed) - payAmt);
    corp.creditUsed = newUsed;
    await corp.save();

    res.json({
      corporate: { ...corp.toJSON(), remainingCredit: Number(corp.creditLimit) - newUsed },
      recorded: { amount: payAmt, note: note || '', recordedAt: new Date().toISOString() },
    });
  } catch (err: any) {
    console.error('[record-payment]', err?.message);
    res.status(500).json({ message: 'Failed to record payment' });
  }
});

/* ── Admin: generate HTML invoice for a corporate ── */
router.get('/:id/invoice', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const corpId = parseInt(String(req.params.id), 10);
    const corp = await Corporate.findByPk(corpId);
    if (!corp) { res.status(404).json({ message: 'Corporate not found' }); return; }

    const bookings = await Booking.findAll({
      where: { corporateId: corpId, status: { [Op.notIn]: ['cancelled', 'failed'] } },
      include: [{ model: User, as: 'bookedByUser', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
    });

    const totalBilled = bookings.reduce((s: number, b: any) => s + Number(b.totalAmount || 0), 0);
    const creditUsed  = Number(corp.creditUsed);
    const creditLimit = Number(corp.creditLimit);
    const outstanding = creditUsed;
    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
    const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const rows = (bookings as any[]).map(b => `
      <tr>
        <td>${b.bookingReference || `#${b.id}`}</td>
        <td>${b.guestName || b.bookedByUser?.name || b.bookedByUser?.email || '—'}</td>
        <td>${b.status}</td>
        <td>${fmtDate(b.createdAt)}</td>
        <td style="text-align:right;font-weight:600">${fmt(b.totalAmount)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice — ${corp.name}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 40px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #555; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    .summary { margin-top: 24px; display: flex; justify-content: flex-end; }
    .summary table { width: 280px; }
    .summary td { border: none; padding: 6px 12px; }
    .summary .label { color: #555; }
    .summary .total { font-weight: 700; font-size: 15px; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .confirmed { background: #d1fae5; color: #065f46; }
    .pending   { background: #fef3c7; color: #92400e; }
    .completed { background: #dbeafe; color: #1e40af; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>HostMyTrip</h1>
  <div class="meta">Corporate Invoice · Generated ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  <hr/>
  <table style="width:100%;margin-bottom:24px;font-size:13px;border:none">
    <tr><td style="border:none;padding:4px 0"><strong>Bill To:</strong></td><td style="border:none;padding:4px 0"><strong>${corp.name}</strong></td></tr>
    <tr><td style="border:none;padding:4px 0;color:#555">GST / Tax ID</td><td style="border:none;padding:4px 0">${corp.taxId || '—'}</td></tr>
    <tr><td style="border:none;padding:4px 0;color:#555">Credit Limit</td><td style="border:none;padding:4px 0">${fmt(creditLimit)}</td></tr>
    <tr><td style="border:none;padding:4px 0;color:#555">Outstanding</td><td style="border:none;padding:4px 0;font-weight:700;color:#dc2626">${fmt(outstanding)}</td></tr>
  </table>
  <table>
    <thead><tr><th>Booking Ref</th><th>Guest</th><th>Status</th><th>Date</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#888">No active bookings</td></tr>'}</tbody>
  </table>
  <div class="summary">
    <table>
      <tr><td class="label">Total Billed</td><td style="text-align:right">${fmt(totalBilled)}</td></tr>
      <tr><td class="label">Credit Used</td><td style="text-align:right">${fmt(creditUsed)}</td></tr>
      <tr><td class="label total">Outstanding</td><td class="total" style="text-align:right;color:#dc2626">${fmt(outstanding)}</td></tr>
    </table>
  </div>
  <div style="margin-top:48px;font-size:12px;color:#888;text-align:center">
    HostMyTrip · This is a system-generated invoice. Please contact us at support@hostmytrip.com for queries.
  </div>
  <script>window.print();</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err: any) {
    console.error('[corporate-invoice]', err?.message);
    res.status(500).json({ message: 'Failed to generate invoice' });
  }
});

router.get('/my/dashboard', authenticate, requireRoles(['corporate_admin', 'corporate_employee']), getCorporateDashboard);
router.get('/my/users', authenticate, requireRoles(['corporate_admin']), listCorporateUsers);
router.post('/my/users', authenticate, requireRoles(['corporate_admin']), createCorporateUser);

export default router;
