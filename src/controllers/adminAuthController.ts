import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse } from '../types';
import { JWT_SECRET } from '../middlewares/authMiddleware';

/**
 * Admin Login
 * POST /api/admin/auth/login
 */
export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอก username และ password',
    });
  }

  // Find admin user
  const result = await query(
    `SELECT id, username, email, password_hash, full_name, role, is_active 
     FROM admin_users 
     WHERE username = ? OR email = ?`,
    [username, username]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({
      success: false,
      error: 'Username หรือ password ไม่ถูกต้อง',
    });
  }

  const admin = result.rows[0];

  if (!admin.is_active) {
    return res.status(401).json({
      success: false,
      error: 'บัญชีถูกปิดการใช้งาน',
    });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, admin.password_hash);
  
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: 'Username หรือ password ไม่ถูกต้อง',
    });
  }

  // Update last login
  await query(
    `UPDATE admin_users SET last_login = NOW() WHERE id = ?`,
    [admin.id]
  );

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: admin.id,
      username: admin.username,
      role: admin.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const response: ApiResponse<{
    token: string;
    admin: {
      id: number;
      username: string;
      email: string;
      full_name: string;
      role: string;
    };
  }> = {
    success: true,
    data: {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
      },
    },
    message: 'เข้าสู่ระบบสำเร็จ',
  };

  res.json(response);
});

/**
 * Get current admin user
 * GET /api/admin/auth/me
 */
export const getCurrentAdmin = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as any;
  
  if (!authReq.adminUser) {
    return res.status(401).json({
      success: false,
      error: 'ไม่พบข้อมูลผู้ใช้',
    });
  }

  const result = await query(
    `SELECT id, username, email, full_name, role, last_login, created_at 
     FROM admin_users 
     WHERE id = ?`,
    [authReq.adminUser.id]
  );

  const response: ApiResponse<any> = {
    success: true,
    data: result.rows[0],
  };

  res.json(response);
});

/**
 * Change password
 * POST /api/admin/auth/change-password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const authReq = req as any;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอก password ทั้งสองช่อง',
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password ต้องมีอย่างน้อย 6 ตัวอักษร',
    });
  }

  // Get current password hash
  const result = await query(
    `SELECT password_hash FROM admin_users WHERE id = ?`,
    [authReq.adminUser.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบผู้ใช้',
    });
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(
    currentPassword,
    result.rows[0].password_hash
  );

  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: 'Password ปัจจุบันไม่ถูกต้อง',
    });
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await query(
    `UPDATE admin_users SET password_hash = ? WHERE id = ?`,
    [newPasswordHash, authReq.adminUser.id]
  );

  const response: ApiResponse = {
    success: true,
    message: 'เปลี่ยน password สำเร็จ',
  };

  res.json(response);
});

