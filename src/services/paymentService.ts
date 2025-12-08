import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database';
import { Order, Payment, PaymentResponse, CreatePaymentRequest } from '../types';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Payment Service - Moneyspec Integration
 * 
 * This service handles payment processing via Moneyspec payment gateway.
 * 
 * Moneyspec API Documentation:
 * - Server: https://stage.moneysp.net (Sandbox) or production URL
 * - Endpoints:
 *   - POST /merchantapi/v2/api/payment/create - Create payment token
 *   - POST /merchantapi/v2/api/payment/options - Get payment options
 *   - POST /merchantapi/v2/api/payment/do-payment - Do payment
 *   - POST /merchantapi/v2/api/payment/capture - Capture payment (if authorized)
 *   - POST /merchantapi/v2/api/payment/cancel - Cancel capture
 *   - POST /merchantapi/v2/api/e-wallet/resend-otp - Resend OTP (TMW)
 *   - POST /merchantapi/v2/api/e-wallet/submit-otp - Submit OTP (TMW)
 * 
 * Moneyspec Configuration:
 * - Web Hook: /webhook.php
 * - Secret ID: MONEYSPEC_SECRET_ID
 * - Secret Key: MONEYSPEC_SECRET_KEY
 */
class PaymentService {
  private baseUrl: string;
  // Moneyspec specific credentials
  private moneyspecSecretId: string;
  private moneyspecSecretKey: string;

  constructor() {
    // Moneyspec configuration
    this.moneyspecSecretId = process.env.MONEYSPEC_SECRET_ID || '';
    this.moneyspecSecretKey = process.env.MONEYSPEC_SECRET_KEY || '';
    // Moneyspec API base URL (sandbox or production)
    this.baseUrl = process.env.MONEYSPEC_BASE_URL || 'https://stage.moneysp.net';
  }

  /**
   * Generate JWT payload for Moneyspec API
   * 
   * @param payload - The payload data to encode
   * @returns JWT token string
   */
  private generateJwtPayload(payload: any): string {
    if (!this.moneyspecSecretId || !this.moneyspecSecretKey) {
      throw new Error('Moneyspec Secret ID and Secret Key must be configured');
    }

    // Create JWT with Secret ID as issuer and Secret Key as secret
    const token = jwt.sign(
      payload,
      this.moneyspecSecretKey,
      {
        issuer: this.moneyspecSecretId,
        expiresIn: '1h', // Adjust based on Moneyspec requirements
      }
    );

    return token;
  }

  /**
   * Create payment token with Moneyspec
   * 
   * @param order - The order to create payment for
   * @param options - Additional options (customerToken, capture, tokenize)
   * @returns Payment token
   */
  async createPaymentToken(
    order: Order,
    options?: {
      customerToken?: string;
      capture?: boolean;
      tokenize?: boolean;
    }
  ): Promise<string> {
    try {
      // Prepare JWT payload
      const jwtPayload = {
        orderId: order.order_number,
        amount: order.total_amount,
        description: `Order ${order.order_number}`,
        callbackUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result`,
        webhookUrl: `${process.env.BACKEND_URL || 'http://localhost:3001'}/webhook.php`,
        ...(options?.customerToken && { customerToken: options.customerToken }),
        ...(options?.capture !== undefined && { capture: options.capture }),
        ...(options?.tokenize !== undefined && { tokenize: options.tokenize }),
      };

      const payload = this.generateJwtPayload(jwtPayload);

      // Call Moneyspec API
      const response = await axios.post(
        `${this.baseUrl}/merchantapi/v2/api/payment/create`,
        { payload },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status !== 200 || !response.data.token) {
        throw new Error(response.data.message || 'Failed to create payment token');
      }

      return response.data.token;
    } catch (error: any) {
      console.error('Create payment token error:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to create payment token');
      }
      throw new Error(`Failed to create payment token: ${error.message}`);
    }
  }

  /**
   * Get payment options from Moneyspec
   * 
   * @param token - Payment token from createPaymentToken
   * @returns Payment options with channels and fees
   */
  async getPaymentOptions(token: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/merchantapi/v2/api/payment/options`,
        { token },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message || 'Failed to get payment options');
      }

      return response.data;
    } catch (error: any) {
      console.error('Get payment options error:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to get payment options');
      }
      throw new Error(`Failed to get payment options: ${error.message}`);
    }
  }

  /**
   * Do payment with Moneyspec (Cards)
   * 
   * @param token - Payment token
   * @param bankProvider - Bank provider (e.g., "KTB")
   * @param payType - Payment type (e.g., "CREDIT_CARD")
   * @param feeType - Fee type ("INCLUDE" or "EXCLUDE")
   * @param cardData - Card information (if not using customerToken)
   * @param customerToken - Customer token (if using saved card)
   * @returns Payment URL
   */
  async doPaymentCard(
    token: string,
    bankProvider: string,
    payType: string,
    feeType: 'INCLUDE' | 'EXCLUDE',
    cardData?: {
      cardName: string;
      cardNo: string;
      expMonth: string;
      expYear: string;
      cvv: string;
    },
    customerToken?: string
  ): Promise<string> {
    try {
      const data: any = {};

      if (customerToken) {
        // Use saved customer token
        data.securePayToken = null;
        data.customerToken = customerToken;
      } else if (cardData) {
        // Use raw card data
        data.securePayToken = {
          cardName: cardData.cardName,
          cardNo: cardData.cardNo,
          expMonth: cardData.expMonth,
          expYear: cardData.expYear,
          cvv: cardData.cvv,
        };
        data.customerToken = '';
      } else {
        throw new Error('Either cardData or customerToken must be provided');
      }

      const response = await axios.post(
        `${this.baseUrl}/merchantapi/v2/api/payment/do-payment`,
        {
          token,
          bankProvider,
          payType,
          feeType,
          data,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status !== 200 || !response.data.data) {
        throw new Error(response.data.message || 'Failed to process payment');
      }

      return response.data.data; // Payment URL
    } catch (error: any) {
      console.error('Do payment error:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to process payment');
      }
      throw new Error(`Failed to process payment: ${error.message}`);
    }
  }

  /**
   * Do payment with Moneyspec (TMW - TrueMoney Wallet)
   * 
   * @param token - Payment token
   * @param bankProvider - Bank provider (should be "TMW")
   * @param payType - Payment type (should be "TMW_CASH")
   * @param feeType - Fee type ("INCLUDE" or "EXCLUDE")
   * @param phoneNo - Customer phone number
   * @returns Payment token and OTP submission URL
   */
  async doPaymentTMW(
    token: string,
    bankProvider: string,
    payType: string,
    feeType: 'INCLUDE' | 'EXCLUDE',
    phoneNo: string
  ): Promise<{ token: string; otpUrl: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/merchantapi/v2/api/payment/do-payment`,
        {
          token,
          bankProvider,
          payType,
          feeType,
          data: {
            phoneNo,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message || 'Failed to process TMW payment');
      }

      return {
        token: response.data.token,
        otpUrl: response.data.data, // OTP submission URL
      };
    } catch (error: any) {
      console.error('Do TMW payment error:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to process TMW payment');
      }
      throw new Error(`Failed to process TMW payment: ${error.message}`);
    }
  }

  /**
   * Resend OTP for TMW payment
   * 
   * @param token - Payment token from doPaymentTMW
   */
  async resendOTP(token: string): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/merchantapi/v2/api/e-wallet/resend-otp`,
        { token },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to resend OTP');
      }
      throw new Error(`Failed to resend OTP: ${error.message}`);
    }
  }

  /**
   * Submit OTP for TMW payment
   * 
   * @param token - Payment token from doPaymentTMW
   * @param otp - OTP code from customer
   * @returns Success status
   */
  async submitOTP(token: string, otp: string): Promise<{ status: number; message: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/merchantapi/v2/api/e-wallet/submit-otp`,
        { token, otp },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        status: response.data.status || response.status,
        message: response.data.message || 'Success',
      };
    } catch (error: any) {
      console.error('Submit OTP error:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to submit OTP');
      }
      throw new Error(`Failed to submit OTP: ${error.message}`);
    }
  }

  /**
   * Create a payment session with Moneyspec
   * 
   * @param order - The order to create payment for
   * @param method - Payment method: 'qr' for TMW or 'card' for credit/debit card
   * @returns Payment URL and related data for frontend
   */
  async createPayment(
    order: Order,
    method: 'qr' | 'card'
  ): Promise<PaymentResponse> {
    try {
      // Create payment record in database first
      const paymentId = await this.createPaymentRecord(
        order.id,
        method === 'qr' ? 'tmw' : 'card',
        order.total_amount
      );

      // Create payment token
      const token = await this.createPaymentToken(order);

      // Get payment options
      const options = await this.getPaymentOptions(token);

      // For card payment, we need to return the token and options for frontend to handle
      // For TMW (QR), we can initiate the payment flow
      if (method === 'qr') {
        // TMW payment flow
        // Note: This requires phone number, which should be collected from customer
        // For now, return the token and options for frontend to handle
        return {
          paymentUrl: `${this.baseUrl}/merchantapi/v2/payment?token=${token}`,
          qrCode: undefined, // TMW uses OTP flow, not QR code
          transactionId: token,
          token, // Include token for frontend to use
          options, // Include options for frontend
        };
      } else {
        // Card payment - return token and options for frontend to handle card input
        return {
          paymentUrl: `${this.baseUrl}/merchantapi/v2/payment?token=${token}`,
          qrCode: undefined,
          transactionId: token,
          token, // Include token for frontend to use
          options, // Include options for frontend to select bank and card type
        };
      }
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

  /**
   * Verify Moneyspec webhook signature using Secret ID and Secret Key
   * 
   * @param payload - The webhook payload
   * @param signature - The signature from X-Moneyspec-Signature header
   * @returns true if signature is valid
   */
  async verifyMoneyspecWebhook(payload: any, signature: string): Promise<boolean> {
    try {
      // If Secret ID or Secret Key is not configured, skip verification (for development)
      if (!this.moneyspecSecretId || !this.moneyspecSecretKey) {
        console.warn('Moneyspec Secret ID or Secret Key not configured. Skipping signature verification.');
        return true; // Allow in development, but should be false in production
      }

      // TODO: Implement actual Moneyspec signature verification
      // Common approach: HMAC-SHA256 of payload with Secret Key
      // The signature format may vary based on Moneyspec documentation
      
      // Example implementation (adjust based on Moneyspec documentation):
      /*
      const crypto = require('crypto');
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.moneyspecSecretKey)
        .update(payloadString)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
      */

      // For now, if signature is provided, do basic check
      if (signature && signature.length > 0) {
        // Basic validation - replace with actual verification
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying Moneyspec webhook signature:', error);
      return false;
    }
  }

  /**
   * Get Moneyspec configuration for display/setup
   */
  getMoneyspecConfig(): {
    webhookUrl: string;
    secretId: string;
    secretKey: string;
  } {
    const backendUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL?.replace(':3000', ':3001') || 'http://localhost:3001';
    return {
      webhookUrl: `${backendUrl}/webhook.php`,
      secretId: this.moneyspecSecretId,
      secretKey: this.moneyspecSecretKey ? '***' + this.moneyspecSecretKey.slice(-4) : '', // Mask secret key
    };
  }
}

export const paymentService = new PaymentService();

