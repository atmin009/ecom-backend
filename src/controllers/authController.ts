import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/database';
import { smsService } from '../services/smsService';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse } from '../types';
import dotenv from 'dotenv';

dotenv.config();

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
const OTP_RATE_LIMIT_SECONDS = parseInt(process.env.OTP_RATE_LIMIT_SECONDS || '60');

/**
 * Request OTP
 * POST /api/auth/otp/request
 */
export const requestOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required',
    });
  }

  // Validate Thai phone number format (10 digits, starts with 0)
  const phoneRegex = /^0[6-9]\d{8}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Thai phone number format. Must be 10 digits starting with 0.',
    });
  }

  // Check rate limiting (prevent spam)
  const recentOTPResult = await query(
    `SELECT created_at FROM otp_requests
     WHERE phone = ?
     AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, OTP_RATE_LIMIT_SECONDS]
  );

  if (recentOTPResult.rows.length > 0) {
    const secondsLeft = OTP_RATE_LIMIT_SECONDS - Math.floor(
      (Date.now() - new Date(recentOTPResult.rows[0].created_at).getTime()) / 1000
    );
    return res.status(429).json({
      success: false,
      error: `Please wait ${secondsLeft} seconds before requesting another OTP`,
    });
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash OTP before storing
  const hashedOTP = await bcrypt.hash(otpCode, 10);

  // Calculate expiry time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  // Store OTP in database
  await query(
    `INSERT INTO otp_requests (phone, otp_code, expires_at, attempts, created_at)
     VALUES (?, ?, ?, 0, NOW())`,
    [phone, hashedOTP, expiresAt]
  );

  // Send OTP via SMS
  const smsSent = await smsService.sendOTP(phone, otpCode);

  if (!smsSent) {
    console.error(`Failed to send OTP SMS to ${phone}`);
    // Still return success to user (don't reveal SMS failure)
  }

  const response: ApiResponse = {
    success: true,
    message: 'OTP sent successfully',
  };

  res.json(response);
});

/**
 * Verify OTP
 * POST /api/auth/otp/verify
 */
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      error: 'Phone number and OTP are required',
    });
  }

  // Find latest OTP for this phone
  const otpResult = await query(
    `SELECT id, otp_code, expires_at, attempts
     FROM otp_requests
     WHERE phone = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone]
  );

  if (otpResult.rows.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No OTP found for this phone number. Please request a new OTP.',
    });
  }

  const otpRecord = otpResult.rows[0];

  // Check if expired
  if (new Date(otpRecord.expires_at) < new Date()) {
    return res.status(400).json({
      success: false,
      error: 'OTP has expired. Please request a new OTP.',
    });
  }

  // Check attempts (max 5 attempts)
  if (otpRecord.attempts >= 5) {
    return res.status(400).json({
      success: false,
      error: 'Too many failed attempts. Please request a new OTP.',
    });
  }

  // Verify OTP
  const isValid = await bcrypt.compare(otp, otpRecord.otp_code);

  if (!isValid) {
    // Increment attempts
    await query(
      `UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ?`,
      [otpRecord.id]
    );

    return res.status(400).json({
      success: false,
      error: 'Invalid OTP code',
    });
  }

  // OTP verified successfully
  // Mark as used (optional: you could add a 'used' flag)
  // For now, we just return success

  const response: ApiResponse = {
    success: true,
    data: {
      phoneVerified: true,
    },
    message: 'OTP verified successfully',
  };

  res.json(response);
});

