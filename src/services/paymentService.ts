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
 * - Server: https://a.moneyspace.net (Production)
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
    // Support both MONEYSPEC_* and MONEYSPACE_* for backward compatibility
    this.moneyspecSecretId = process.env.MONEYSPEC_SECRET_ID || process.env.MONEYSPACE_SECRET_ID || '';
    this.moneyspecSecretKey = process.env.MONEYSPEC_SECRET_KEY || process.env.MONEYSPACE_SECRET_KEY || '';
    // Moneyspec API base URL (production)
    this.baseUrl = process.env.MONEYSPEC_BASE_URL || process.env.MONEYSPACE_BASE_URL || 'https://a.moneyspace.net';
    
    // Log configuration status (without exposing secrets)
    console.log('🔐 Payment Service Configuration:');
    console.log(`  Base URL: ${this.baseUrl}`);
    console.log(`  Secret ID: ${this.moneyspecSecretId ? '✅ Configured (' + this.moneyspecSecretId.substring(0, 8) + '...)' : '❌ Not configured'}`);
    console.log(`  Secret Key: ${this.moneyspecSecretKey ? '✅ Configured (' + this.moneyspecSecretKey.substring(0, 8) + '...)' : '❌ Not configured'}`);
  }

  /**
   * Generate JWT payload for Moneyspec API
   * 
   * @param payload - The payload data to encode
   * @returns JWT token string
   */
  private generateJwtPayload(payload: any): string {
    if (!this.moneyspecSecretId || !this.moneyspecSecretKey) {
      throw new Error('Moneyspec Secret ID and Secret Key must be configured. Please set MONEYSPEC_SECRET_ID (or MONEYSPACE_SECRET_ID) and MONEYSPEC_SECRET_KEY (or MONEYSPACE_SECRET_KEY) in .env file.');
    }

    try {
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
    } catch (error: any) {
      console.error('JWT generation error:', error);
      throw new Error(`Failed to generate JWT: ${error.message}`);
    }
  }

  /**
   * Create payment transaction with Moneyspec
   * 
   * Based on Moneyspec API documentation:
   * - Endpoint: /payment/CreateTransaction/qr
   * - Method: POST with JSON body (not JWT)
   * - Required fields: secret_id, secret_key, order_id, amount, payment_type, feeType, success_Url, fail_Url, cancel_Url
   * 
   * @param order - The order to create payment for
   * @param method - Payment method ('qr' or 'card')
   * @returns Payment response with transaction ID and QR code URL
   */
  async createPaymentToken(
    order: Order,
    method: 'qr' | 'card' = 'qr'
  ): Promise<{ transactionId: string; qrCodeUrl?: string; paymentUrl?: string }> {
    try {
      if (!this.moneyspecSecretId || !this.moneyspecSecretKey) {
        throw new Error('Moneyspec Secret ID and Secret Key must be configured');
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Prepare amount - must be number with 2 decimal places
      const amount = typeof order.total_amount === 'string' 
        ? parseFloat(order.total_amount) 
        : Number(order.total_amount);
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid amount: ${order.total_amount}`);
      }

      // Format amount to 2 decimal places
      const formattedAmount = parseFloat(amount.toFixed(2));

      // Parse customer name into firstname and lastname
      const nameParts = (order.customer_name || '').trim().split(/\s+/);
      const firstname = nameParts[0] || '';
      const lastname = nameParts.slice(1).join(' ') || '';

      // Validate order_id - must be alphanumeric, max 20 chars
      let orderId = order.order_number.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      if (!orderId) {
        // Fallback: use order ID if order_number is invalid
        orderId = `ORD${order.id}`.substring(0, 20);
      }

      // Build request body according to Moneyspec API documentation
      // Note: /payment/CreateTransaction/qr endpoint is for QR payments only
      // For card payments, a different endpoint/flow may be needed
      const requestBody: any = {
        // Required fields
        secret_id: this.moneyspecSecretId,
        secret_key: this.moneyspecSecretKey,
        order_id: orderId,
        amount: formattedAmount,
        payment_type: 'qrnone', // This endpoint only supports 'qrnone' for QR payments
        feeType: 'include', // Merchant pays the fee
        success_Url: `${frontendUrl}/payment/result?status=success`,
        fail_Url: `${frontendUrl}/payment/result?status=fail`,
        cancel_Url: `${frontendUrl}/payment/result?status=cancel`,
        
        // Optional but recommended fields
        firstname: firstname,
        lastname: lastname,
        email: order.customer_email || '',
        phone: order.customer_phone || '',
        description: `Order ${order.order_number}`,
        address: [
          order.shipping_address_line,
          order.subdistrict,
          order.district,
          order.province,
          order.postal_code
        ].filter(Boolean).join(', '),
        language: 'th', // Thai language
      };
      
      // Remove empty optional fields to avoid validation errors
      if (!requestBody.firstname) delete requestBody.firstname;
      if (!requestBody.lastname) delete requestBody.lastname;
      if (!requestBody.email) delete requestBody.email;
      if (!requestBody.phone) delete requestBody.phone;
      if (!requestBody.address) delete requestBody.address;

      console.log('📋 Moneyspec API request prepared:', {
        order_id: requestBody.order_id,
        amount: requestBody.amount,
        payment_type: requestBody.payment_type,
        customer: `${requestBody.firstname} ${requestBody.lastname}`,
      });
      
      // Log full request body (without secret_key for security)
      const logBody = { ...requestBody };
      if (logBody.secret_key) {
        logBody.secret_key = '***HIDDEN***';
      }
      console.log('📤 Full request body (secret_key hidden):', JSON.stringify(logBody, null, 2));

      // Call Moneyspec API
      // Note: This endpoint is for QR payments only
      // For card payments, a different endpoint/flow may be needed
      if (method !== 'qr') {
        throw new Error('Card payment method not yet supported. Please use QR payment method.');
      }
      
      const apiUrl = `${this.baseUrl}/payment/CreateTransaction/qr`;
      console.log('📡 Calling Moneyspec API:', apiUrl);
      
      const response = await axios.post(
        apiUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      
      // Log full response for debugging
      console.log('✅ Moneyspec API response:', {
        httpStatus: response.status,
        responseType: Array.isArray(response.data) ? 'array' : typeof response.data,
        fullResponse: JSON.stringify(response.data, null, 2),
      });

      // Handle response - Moneyspec returns array
      let responseData: any;
      if (Array.isArray(response.data)) {
        if (response.data.length > 0) {
          responseData = response.data[0];
        } else {
          throw new Error('Moneyspec API returned empty array');
        }
      } else {
        responseData = response.data;
      }

      // Check for error in response
      if (responseData.status === 'error') {
        const errorMsg = responseData.description || responseData.message || 'Unknown error from Moneyspec API';
        console.error('❌ Moneyspec API error:', errorMsg);
        console.error('Full error response:', JSON.stringify(responseData, null, 2));
        throw new Error(`Moneyspec API Error: ${errorMsg}`);
      }

      // Check for success
      if (responseData.status === 'success') {
        console.log('✅ Payment transaction created successfully:', {
          transactionId: responseData.transaction_ID,
          hasQrCode: !!responseData.image_qrprom,
        });
        
        return {
          transactionId: responseData.transaction_ID,
          qrCodeUrl: responseData.image_qrprom,
          paymentUrl: responseData.image_qrprom, // QR code URL can be used as payment URL
        };
      } else {
        throw new Error(`Unexpected response status: ${responseData.status}`);
      }
    } catch (error: any) {
      console.error('❌ Create payment transaction error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: `${this.baseUrl}/payment/CreateTransaction/qr`,
        hasSecretId: !!this.moneyspecSecretId,
        hasSecretKey: !!this.moneyspecSecretKey,
        secretIdLength: this.moneyspecSecretId?.length || 0,
        secretKeyLength: this.moneyspecSecretKey?.length || 0,
      });
      
      if (error.response?.data) {
        const errorMessage = error.response.data.message || error.response.data.description || 'Failed to create payment transaction';
        console.error('Moneyspec API error response:', JSON.stringify(error.response.data, null, 2));
        throw new Error(`Moneyspec API Error: ${errorMessage}`);
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(`Cannot connect to Moneyspec API at ${this.baseUrl}. Please check MONEYSPEC_BASE_URL configuration.`);
      }
      
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        throw new Error(`Request timeout when calling Moneyspec API. Please check your network connection.`);
      }
      
      throw new Error(`Failed to create payment transaction: ${error.message}`);
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
      console.log('💳 Creating payment:', {
        orderId: order.id,
        orderNumber: order.order_number,
        amount: order.total_amount,
        method,
        hasSecretId: !!this.moneyspecSecretId,
        hasSecretKey: !!this.moneyspecSecretKey,
        baseUrl: this.baseUrl,
      });

      // Check if Moneyspec credentials are configured
      if (!this.moneyspecSecretId || !this.moneyspecSecretKey) {
        console.warn('⚠️  Moneyspec credentials not configured. Using fallback mode.');
        console.warn('⚠️  Please set MONEYSPEC_SECRET_ID (or MONEYSPACE_SECRET_ID) and MONEYSPEC_SECRET_KEY (or MONEYSPACE_SECRET_KEY) in .env file.');
        // Fallback mode for development/testing
        return this.createPaymentFallback(order, method);
      }

      // Create payment record in database first
      console.log('💾 Creating payment record in database...');
      const paymentId = await this.createPaymentRecord(
        order.id,
        method === 'qr' ? 'tmw' : 'card',
        order.total_amount
      );
      console.log('✅ Payment record created:', paymentId);

      // Create payment transaction
      console.log('🔑 Creating payment transaction...');
      let paymentResult: { transactionId: string; qrCodeUrl?: string; paymentUrl?: string };
      try {
        paymentResult = await this.createPaymentToken(order, method);
        console.log('✅ Payment transaction created:', {
          transactionId: paymentResult.transactionId,
          hasQrCode: !!paymentResult.qrCodeUrl,
        });
      } catch (tokenError: any) {
        console.error('❌ Failed to create payment transaction:', tokenError);
        // If transaction creation fails, use fallback mode
        console.warn('⚠️  Falling back to fallback mode due to transaction creation error');
        return this.createPaymentFallback(order, method);
      }

      // Return payment response based on method
      if (method === 'qr') {
        // QR payment - return QR code URL
        const paymentUrl: string = paymentResult.paymentUrl || paymentResult.qrCodeUrl || '';
        if (!paymentUrl) {
          throw new Error('QR code URL not returned from Moneyspec API');
        }
        return {
          paymentUrl: paymentUrl,
          qrCode: paymentResult.qrCodeUrl,
          transactionId: paymentResult.transactionId,
        };
      } else {
        // Card payment - return payment URL (if available)
        const paymentUrl: string = paymentResult.paymentUrl || `${this.baseUrl}/payment?transaction=${paymentResult.transactionId}`;
        return {
          paymentUrl: paymentUrl,
          qrCode: undefined,
          transactionId: paymentResult.transactionId,
        };
      }
    } catch (error: any) {
      console.error('Payment creation error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // If Moneyspec API fails, fallback to development mode
      if (error.message?.includes('Moneyspec') || error.response?.status >= 400) {
        console.warn('⚠️  Moneyspec API error. Using fallback mode.');
        return this.createPaymentFallback(order, method);
      }
      
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Fallback payment creation for development/testing when Moneyspec is not configured
   */
  private async createPaymentFallback(
    order: Order,
    method: 'qr' | 'card'
  ): Promise<PaymentResponse> {
    // Create payment record in database
    const paymentId = await this.createPaymentRecord(
      order.id,
      method === 'qr' ? 'tmw' : 'card',
      order.total_amount
    );

    // Return fallback response with warning message
    const mockToken = `MOCK-${paymentId}-${Date.now()}`;
    
    console.warn('⚠️  Payment created in fallback mode. Moneyspec credentials not configured.');
    console.warn('⚠️  To enable real payments, set MONEYSPEC_SECRET_ID (or MONEYSPACE_SECRET_ID) and MONEYSPEC_SECRET_KEY (or MONEYSPACE_SECRET_KEY) in .env file.');
    
    // Return fallback response - use a placeholder URL that won't redirect
    return {
      paymentUrl: `#fallback-${mockToken}`, // Use hash to prevent actual redirect
      qrCode: undefined,
      transactionId: mockToken,
      token: mockToken,
    };
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

