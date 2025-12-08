import { Request, Response } from 'express';
import { query } from '../config/database';
import { paymentService } from '../services/paymentService';
import { asyncHandler } from '../middlewares/errorHandler';
import { CreatePaymentRequest, ApiResponse, Order } from '../types';

/**
 * Create payment
 * POST /api/payments/create
 */
export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const { orderId, method }: CreatePaymentRequest = req.body;

  if (!orderId || !method) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุหมายเลขออเดอร์และวิธีการชำระเงิน',
    });
  }

  if (method !== 'qr' && method !== 'card') {
    return res.status(400).json({
      success: false,
      error: 'วิธีการชำระเงินต้องเป็น "qr" หรือ "card"',
    });
  }

  // Get order
  const orderResult = await query(
    `SELECT * FROM orders WHERE id = ?`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบข้อมูลออเดอร์',
    });
  }

  const order: Order = orderResult.rows[0];

  // Check if order is already paid
  if (order.payment_status === 'paid') {
    return res.status(400).json({
      success: false,
      error: 'ออเดอร์นี้ชำระเงินแล้ว',
    });
  }

  // Check if order payment is pending
  if (order.payment_status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: `สถานะการชำระเงินของออเดอร์คือ ${order.payment_status} ไม่สามารถสร้างการชำระเงินใหม่ได้`,
    });
  }

  // Create payment with Money Space
  const paymentResponse = await paymentService.createPayment(order, method);

  const apiResponse: ApiResponse<any> = {
    success: true,
    data: paymentResponse,
    message: 'สร้างการชำระเงินสำเร็จ',
  };

  res.json(apiResponse);
});

/**
 * Handle Money Space webhook
 * POST /api/payments/moneyspace/webhook
 */
export const handleMoneySpaceWebhook = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body;

  console.log('Received Money Space webhook:', JSON.stringify(payload, null, 2));

  // Handle webhook
  const result = await paymentService.handleWebhook(payload);

  if (result.success) {
    res.json({ success: true, message: 'Webhook processed successfully' });
  } else {
    res.status(400).json({ success: false, error: 'Webhook processing failed' });
  }
});

/**
 * Handle Moneyspec webhook
 * POST /api/payments/moneyspec/webhook
 * This endpoint is called by webhook.php when Moneyspec sends webhook
 */
export const handleMoneyspecWebhook = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body;
  const signature = req.headers['x-moneyspec-signature'] as string;

  console.log('Received Moneyspec webhook:', JSON.stringify(payload, null, 2));

  // Verify webhook signature using Secret ID and Secret Key
  const isValid = await paymentService.verifyMoneyspecWebhook(payload, signature);

  if (!isValid) {
    console.error('Invalid Moneyspec webhook signature');
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid webhook signature' 
    });
  }

  // Handle webhook
  const result = await paymentService.handleWebhook(payload);

  if (result.success) {
    res.json({ success: true, message: 'Webhook processed successfully' });
  } else {
    res.status(400).json({ success: false, error: 'Webhook processing failed' });
  }
});

