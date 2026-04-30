import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    const normalizedUser = {
      ...decoded,
      id: decoded?.id ?? decoded?.userId ?? null,
      role: String(decoded?.role ?? decoded?.userRole ?? '').toLowerCase(),
    };
    (req as any).user = normalizedUser;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const role = (req as any).user?.role;
  if (role !== 'admin' && role !== 'employee') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
};

export const requireRoles = (roles: string[]) => (req: Request, res: Response, next: NextFunction): void => {
  const role = String((req as any).user?.role || '').toLowerCase();
  if (!roles.includes(role)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  next();
};
