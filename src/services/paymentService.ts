import axios from 'axios';
import { query } from '../config/database';
import { Order, Payment, PaymentResponse, CreatePaymentRequest } from '../types';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Payment Service - Money Space Integration
 * 
 * This service handles payment processing via Money Space payment gateway.
 * 
 * TODO: Replace placeholder implementations with actual Money Space API calls.
 * 
 * Money Space typically provides:
 * - Payment link generation
 * - QR code generation (PromptPay)
 * - Credit/debit card payment processing
 * - Webhook callbacks for payment status updates
 * 
 * Documentation: Refer to Money Space API documentation for exact endpoints and payloads.
 */
class PaymentService {
  private apiKey: string;
  private merchantId: string;
  private webhookSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.MONEYSPACE_API_KEY || '';
    this.merchantId = process.env.MONEYSPACE_MERCHANT_ID || '';
    this.webhookSecret = process.env.MONEYSPACE_WEBHOOK_SECRET || '';
    this.baseUrl = process.env.MONEYSPACE_BASE_URL || 'https://api.moneyspace.com';
  }

  /**
   * Create a payment session with Money Space
   * 
   * @param order - The order to create payment for
   * @param method - Payment method: 'qr' for QR code (PromptPay) or 'card' for credit/debit card
   * @returns Payment URL and related data for frontend
   */
  async createPayment(
    order: Order,
    method: 'qr' | 'card'
  ): Promise<PaymentResponse> {
    try {
      // Get order items for payment description
      const orderItemsResult = await query(
        `SELECT oi.*, p.name as product_name
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      const items = orderItemsResult.rows;

      // TODO: Replace with actual Money Space API call
      // Example structure:
      /*
      const payload = {
        merchant_id: this.merchantId,
        order_id: order.order_number,
        amount: order.total_amount,
        currency: 'THB',
        payment_method: method === 'qr' ? 'promptpay' : 'card',
        callback_url: `${process.env.FRONTEND_URL}/payment/result`,
        webhook_url: `${process.env.BACKEND_URL}/api/payments/moneyspace/webhook`,
        customer: {
          name: order.customer_name,
          phone: order.customer_phone,
        },
        items: items.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price,
        })),
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/payments/create`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const paymentData = response.data;
      */

      // PLACEHOLDER: For now, return mock payment URL
      // In production, use actual API response above
      console.log(`[Payment] Creating payment for order ${order.order_number}`);
      console.log(`[Payment] Amount: ${order.total_amount} THB`);
      console.log(`[Payment] Method: ${method}`);
      console.log(`[Payment] Money Space API: ${this.baseUrl}`);

      // Create payment record in database
      const paymentId = await this.createPaymentRecord(
        order.id,
        method === 'qr' ? 'promptpay' : 'card',
        order.total_amount
      );

      // Mock response - replace with actual Money Space response
      const mockPaymentUrl = method === 'qr'
        ? `${this.baseUrl}/pay/qr?payment_id=${paymentId}&order=${order.order_number}`
        : `${this.baseUrl}/pay/card?payment_id=${paymentId}&order=${order.order_number}`;

      return {
        paymentUrl: mockPaymentUrl,
        qrCode: method === 'qr' ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${mockPaymentUrl}` : undefined,
        transactionId: `TXN-${paymentId}-${Date.now()}`,
      };
    } catch (error: any) {
      console.error('Payment creation error:', error);
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Create payment record in database
   */
  private async createPaymentRecord(
    orderId: number,
    gateway: string,
    amount: number
  ): Promise<number> {
    try {
      const result = await query(
        `INSERT INTO payments (order_id, gateway, amount, status, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
        [orderId, gateway, amount]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating payment record:', error);
      throw error;
    }
  }

  /**
   * Handle Money Space webhook
   * 
   * This endpoint is called by Money Space when payment status changes.
   * 
   * TODO: Implement actual webhook signature verification and payload parsing
   * based on Money Space documentation.
   */
  async handleWebhook(payload: any): Promise<{ success: boolean; orderId?: number }> {
    try {
      // TODO: Verify webhook signature
      /*
      const signature = req.headers['x-moneyspace-signature'];
      const isValid = this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
      */

      // TODO: Parse Money Space webhook payload
      // Example structure (adjust based on actual Money Space format):
      /*
      const {
        transaction_id,
        order_id, // or order_number
        status, // 'success', 'failed', 'pending'
        amount,
        payment_method,
        timestamp,
      } = payload;
      */

      // PLACEHOLDER: For now, expect payload in this format
      const transactionId = payload.transaction_id || payload.id;
      const orderNumber = payload.order_id || payload.order_number;
      const status = payload.status || payload.payment_status;
      const amount = payload.amount;

      // Find order by order_number
      const orderResult = await query(
        `SELECT id FROM orders WHERE order_number = ?`,
        [orderNumber]
      );

      if (orderResult.rows.length === 0) {
        throw new Error(`Order not found: ${orderNumber}`);
      }

      const orderId = orderResult.rows[0].id;

      // Update payment record
      await query(
        `UPDATE payments 
         SET gateway_transaction_id = ?, 
             status = ?, 
             raw_response = ?,
             updated_at = NOW()
         WHERE order_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [transactionId, status === 'success' ? 'success' : 'failed', JSON.stringify(payload), orderId]
      );

      // Update order payment status
      await query(
        `UPDATE orders 
         SET payment_status = ?, updated_at = NOW()
         WHERE id = ?`,
        [status === 'success' ? 'paid' : 'failed', orderId]
      );

      // If payment successful, send SMS notification
      if (status === 'success') {
        const orderResult = await query(
          `SELECT customer_phone, order_number FROM orders WHERE id = ?`,
          [orderId]
        );
        if (orderResult.rows.length > 0) {
          const { customer_phone, order_number } = orderResult.rows[0];
          const { smsService } = await import('./smsService');
          await smsService.sendNotification(
            customer_phone,
            `Payment successful for order ${order_number}. Thank you for your purchase!`
          );
        }
      }

      return { success: true, orderId };
    } catch (error: any) {
      console.error('Webhook handling error:', error);
      return { success: false };
    }
  }

  /**
   * Verify webhook signature (if Money Space provides signature verification)
   */
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // TODO: Implement signature verification based on Money Space documentation
    // Common approach: HMAC-SHA256 of payload with webhook secret
    return true; // Placeholder
  }
}

export const paymentService = new PaymentService();

