import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { AuditLog } from '../models';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logAudit, AUDIT } from '../services/auditService';

const router = Router();

/* ────────────────────────────────────────────────────────────────────
   GET /api/admin/audit-logs
   Query params:
     page, pageSize, action, actorEmail, entityType, entityId,
     success, dateFrom, dateTo, q (free-text search), format (json|csv)
   ──────────────────────────────────────────────────────────────────── */
router.get('/audit-logs', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const page     = Math.max(1, parseInt(String(req.query.page     || '1'), 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(String(req.query.pageSize || '50'), 10)));
    const action      = String(req.query.action      || '').trim();
    const actorEmail  = String(req.query.actorEmail   || '').trim();
    const entityType  = String(req.query.entityType   || '').trim();
    const entityId    = String(req.query.entityId     || '').trim();
    const success     = String(req.query.success      || '').trim();
    const dateFrom    = String(req.query.dateFrom     || '').trim();
    const dateTo      = String(req.query.dateTo       || '').trim();
    const q           = String(req.query.q            || '').trim();
    const format      = String(req.query.format       || 'json').trim().toLowerCase();

    /* ── Build where clause ─────────────────────────── */
    const where: any = {};
    if (action)     where.action     = { [Op.like]: `%${action}%` };
    if (actorEmail) where.actorEmail = { [Op.like]: `%${actorEmail}%` };
    if (entityType) where.entityType = entityType;
    if (entityId)   where.entityId   = parseInt(entityId, 10) || 0;
    if (success === 'true')  where.success = true;
    if (success === 'false') where.success = false;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom + 'T00:00:00');
      if (dateTo)   where.createdAt[Op.lte] = new Date(dateTo   + 'T23:59:59');
    }

    if (q) {
      where[Op.or] = [
        { action:      { [Op.like]: `%${q}%` } },
        { actorEmail:  { [Op.like]: `%${q}%` } },
        { entityType:  { [Op.like]: `%${q}%` } },
        { errorMessage:{ [Op.like]: `%${q}%` } },
        { ip:          { [Op.like]: `%${q}%` } },
      ];
    }

    /* ── CSV export (all matching rows, no pagination) ── */
    if (format === 'csv') {
      const all = await AuditLog.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: 10000,  // safety cap
      });

      // Log the export action
      logAudit(req, {
        action: AUDIT.ADMIN_AUDIT_VIEWED,
        metadata: { format: 'csv', filters: req.query, rowCount: all.length },
      });

      const header = 'ID,Timestamp,Action,Actor Email,Actor Role,Entity Type,Entity ID,IP,Success,Error Message\n';
      const rows = all.map((r: any) => {
        const rj = r.toJSON();
        const ts = rj.createdAt ? new Date(rj.createdAt).toISOString() : '';
        return [
          rj.id,
          ts,
          `"${(rj.action || '').replace(/"/g, '""')}"`,
          `"${(rj.actorEmail || '').replace(/"/g, '""')}"`,
          `"${(rj.actorRole || '').replace(/"/g, '""')}"`,
          `"${(rj.entityType || '').replace(/"/g, '""')}"`,
          rj.entityId ?? '',
          `"${(rj.ip || '').replace(/"/g, '""')}"`,
          rj.success,
          `"${(rj.errorMessage || '').replace(/"/g, '""')}"`,
        ].join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().slice(0,10)}.csv"`);
      res.send(header + rows);
      return;
    }

    /* ── JSON (paginated) ───────────────────────────── */
    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    // Log the view action (fire-and-forget, won't slow response)
    logAudit(req, {
      action: AUDIT.ADMIN_AUDIT_VIEWED,
      metadata: { format: 'json', page, pageSize, filters: req.query },
    });

    res.json({
      items: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    });
  } catch (err: any) {
    console.error('[admin/audit-logs] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to load audit logs', detail: err?.message });
  }
});

/* ────────────────────────────────────────────────────────────────────
   GET /api/admin/audit-logs/actions
   Returns distinct action names for populating filter dropdowns
   ──────────────────────────────────────────────────────────────────── */
router.get('/audit-logs/actions', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const results: any = await AuditLog.findAll({
      attributes: [[AuditLog.sequelize!.fn('DISTINCT', AuditLog.sequelize!.col('action')), 'action']],
      order: [['action', 'ASC']],
      raw: true,
    });
    res.json(results.map((r: any) => r.action).filter(Boolean));
  } catch (err: any) {
    console.error('[admin/audit-logs/actions] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to load actions' });
  }
});

/* ────────────────────────────────────────────────────────────────────
   GET /api/admin/audit-logs/:id
   Single audit log detail
   ──────────────────────────────────────────────────────────────────── */
router.get('/audit-logs/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const log = await AuditLog.findByPk(id);
    if (!log) {
      res.status(404).json({ message: 'Audit log not found' });
      return;
    }
    res.json(log);
  } catch (err: any) {
    console.error('[admin/audit-logs/:id] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed to load audit log' });
  }
});

export default router;
