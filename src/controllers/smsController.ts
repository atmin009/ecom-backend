import { Request, Response } from 'express';
import { mailbitSmsService } from '../services/mailbitSmsService';
import { asyncHandler } from '../middlewares/errorHandler';

/**
 * Send payment success SMS
 * POST /api/sms/payment-success
 * 
 * Body:
 * {
 *   "phone": "6681xxxxxxx",
 *   "orderId": "FS123456"
 * }
 */
export const sendPaymentSuccessSms = asyncHandler(
  async (req: Request, res: Response) => {
    const { phone, orderId } = req.body;

    // Validate phone number
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required and must be a string',
      });
    }

    // Validate phone format (should be in format 6681xxxxxxx)
    const phoneRegex = /^66\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid phone number format. Expected format: 6681xxxxxxx (Thai format with country code)',
      });
    }

    // Validate order ID
    if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required and must be a non-empty string',
      });
    }

    try {
      // Send SMS via MailBIT
      const result = await mailbitSmsService.sendPaymentSuccessSms({
        phone,
        orderId,
      });

      res.json({
        success: true,
        data: result,
        message: 'SMS sent successfully',
      });
    } catch (error: any) {
      console.error('SMS sending error in controller:', error);
      throw error; // Let errorHandler middleware handle it
    }
  }
);

