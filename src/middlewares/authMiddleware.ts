import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

export interface AuthRequest extends Request {
  adminUser?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token and attach admin user to request
 */
export const authenticateAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'ไม่พบ token การยืนยันตัวตน',
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Verify admin user exists and is active
      const result = await query(
        `SELECT id, username, email, role, is_active 
         FROM admin_users 
         WHERE id = ? AND is_active = true`,
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'ผู้ใช้ไม่พบหรือถูกปิดการใช้งาน',
        });
      }

      const adminUser = result.rows[0];
      req.adminUser = {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Token ไม่ถูกต้องหรือหมดอายุ',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการยืนยันตัวตน',
    });
  }
};

/**
 * Check if admin has required role
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.adminUser) {
      return res.status(401).json({
        success: false,
        error: 'ไม่ได้รับอนุญาต',
      });
    }

    if (!roles.includes(req.adminUser.role)) {
      return res.status(403).json({
        success: false,
        error: 'ไม่มีสิทธิ์เข้าถึง',
      });
    }

    next();
  };
};

export { JWT_SECRET };

