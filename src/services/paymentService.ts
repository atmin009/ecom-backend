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
   * Create payment token with Moneyspec
   * 
   * @param order - The order to create payment for
   * @param options - Additional options (customerToken, capture, tokenize)
   * @param trySatang - If true, try amount in satang instead of THB
   * @returns Payment token
   */
  async createPaymentToken(
    order: Order,
    options?: {
      customerToken?: string;
      capture?: boolean;
      tokenize?: boolean;
    },
    trySatang: boolean = false
  ): Promise<string> {
    try {
      // Prepare JWT payload
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Ensure webhook URL doesn't have /api prefix (webhook.php is at root)
      const webhookUrl = backendUrl.endsWith('/api') 
        ? backendUrl.replace('/api', '') + '/webhook.php'
        : backendUrl + '/webhook.php';
      
      // Prepare JWT payload according to Moneyspec API requirements
      // Ensure amount is a number, not string
      const amountInTHB = typeof order.total_amount === 'string' 
        ? parseFloat(order.total_amount) 
        : Number(order.total_amount);
      
      // Validate amount
      if (isNaN(amountInTHB) || amountInTHB <= 0) {
        throw new Error(`Invalid amount: ${order.total_amount}`);
      }
      
      // Convert THB to satang (smallest currency unit)
      // 1 THB = 100 satang
      // Some APIs expect amount in smallest currency unit (satang)
      const amountInSatang = Math.round(amountInTHB * 100);
      
      // Build JWT payload according to Moneyspec API requirements
      // Based on 2C2P/Moneyspec pattern: merchantID, invoiceNo, amount, currencyCode
      const jwtPayload: any = {
        // Required fields per API documentation
        merchantID: this.moneyspecSecretId, // Merchant ID (using Secret ID)
        invoiceNo: order.order_number,      // Unique invoice/order number
        amount: trySatang ? amountInSatang : amountInTHB, // Try satang if requested
        currencyCode: 'THB',                 // ISO 4217 currency code
        description: `Order ${order.order_number}`, // Transaction description
      };
      
      console.log(`💰 Amount format: ${trySatang ? 'satang' : 'THB'} = ${jwtPayload.amount}`);
      
      // Also try with amount in satang as alternative (commented for now)
      // If main currency doesn't work, we'll try satang
      // amount: amountInSatang,
      
      // Add callback and webhook URLs if provided
      if (frontendUrl) {
        jwtPayload.callbackUrl = `${frontendUrl}/payment/result`;
      }
      if (webhookUrl) {
        jwtPayload.webhookUrl = webhookUrl;
      }
      
      // Add optional fields if provided
      if (options?.customerToken) {
        jwtPayload.customerToken = options.customerToken;
      }
      if (options?.capture !== undefined) {
        jwtPayload.capture = options.capture;
      }
      if (options?.tokenize !== undefined) {
        jwtPayload.tokenize = options.tokenize;
      }
      
      console.log('📋 JWT Payload prepared:', {
        orderId: jwtPayload.orderId,
        amount: jwtPayload.amount,
        amountType: typeof jwtPayload.amount,
        callbackUrl: jwtPayload.callbackUrl,
        webhookUrl: jwtPayload.webhookUrl,
        payloadKeys: Object.keys(jwtPayload),
      });

      console.log('🔑 Generating JWT payload for order:', order.order_number);
      const payload = this.generateJwtPayload(jwtPayload);
      console.log('✅ JWT payload generated successfully');
      console.log('🔍 JWT token (first 50 chars):', payload.substring(0, 50) + '...');
      
      // Decode JWT to verify payload (without verification, just to see structure)
      try {
        const decoded = jwt.decode(payload, { complete: true });
        console.log('🔍 Decoded JWT structure:', {
          header: decoded?.header,
          payload: decoded?.payload,
          payloadKeys: decoded?.payload ? Object.keys(decoded.payload as any) : [],
        });
      } catch (e) {
        console.log('⚠️  Could not decode JWT for inspection');
      }

      // Call Moneyspec API
      const apiUrl = `${this.baseUrl}/merchantapi/v2/api/payment/create`;
      console.log('📡 Calling Moneyspec API:', apiUrl);
      
      // Try sending JWT in Authorization header first (common pattern)
      // If that doesn't work, try in body
      let response;
      try {
        // Method 1: JWT in Authorization header
        console.log('📤 Attempting Method 1: JWT in Authorization header');
        response = await axios.post(
          apiUrl,
          {}, // Empty body
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${payload}`,
            },
            timeout: 30000,
          }
        );
        console.log('✅ Method 1 (Authorization header) succeeded');
      } catch (error: any) {
        // If Authorization header fails, try in body
        if (error.response?.status === 400 || error.response?.status === 401) {
          console.log('⚠️  Method 1 failed, trying Method 2: JWT in body as payload');
          try {
            response = await axios.post(
              apiUrl,
              { payload }, // JWT in body
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                timeout: 30000,
              }
            );
            console.log('✅ Method 2 (body payload) succeeded');
          } catch (error2: any) {
            // Try Method 3: JWT directly in body (not wrapped)
            console.log('⚠️  Method 2 failed, trying Method 3: JWT directly in body');
            response = await axios.post(
              apiUrl,
              payload, // JWT as string directly
              {
                headers: {
                  'Content-Type': 'text/plain',
                },
                timeout: 30000,
              }
            );
            console.log('✅ Method 3 (direct body) succeeded');
          }
        } else {
          throw error;
        }
      }
      
      // Log full response for debugging
      console.log('✅ Moneyspec API response:', {
        httpStatus: response.status,
        responseType: Array.isArray(response.data) ? 'array' : typeof response.data,
        fullResponse: JSON.stringify(response.data, null, 2),
      });

      // Handle response - Moneyspec may return array or object
      let responseData: any;
      if (Array.isArray(response.data)) {
        // If response is array, check first element
        if (response.data.length > 0) {
          responseData = response.data[0];
          console.log('⚠️  Response is array, using first element:', responseData);
        } else {
          throw new Error('Moneyspec API returned empty array');
        }
      } else {
        responseData = response.data;
      }

      // Check for error in response
      if (responseData.status === 'error' || responseData.status !== 200) {
        const errorMsg = responseData.description || responseData.message || 'Unknown error from Moneyspec API';
        console.error('❌ Moneyspec API error:', errorMsg);
        console.error('Full error response:', JSON.stringify(responseData, null, 2));
        
        // If "Data incorrect" and we haven't tried satang yet, retry with satang
        if (errorMsg.toLowerCase().includes('data incorrect') && !trySatang) {
          console.log('🔄 Retrying with amount in satang (smallest currency unit)...');
          return this.createPaymentToken(order, options, true);
        }
        
        throw new Error(`Moneyspec API Error: ${errorMsg}`);
      }

      // Check if token exists
      if (responseData.token) {
        console.log('✅ Payment token received:', responseData.token.substring(0, 20) + '...');
        return responseData.token;
      } else {
        // Success but no token
        console.error('❌ Moneyspec API returned success but no token:', JSON.stringify(responseData, null, 2));
        throw new Error(responseData.message || 'Moneyspec API returned success but no token in response');
      }
    } catch (error: any) {
      console.error('❌ Create payment token error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: `${this.baseUrl}/merchantapi/v2/api/payment/create`,
        hasSecretId: !!this.moneyspecSecretId,
        hasSecretKey: !!this.moneyspecSecretKey,
        secretIdLength: this.moneyspecSecretId?.length || 0,
        secretKeyLength: this.moneyspecSecretKey?.length || 0,
      });
      
      if (error.response?.data) {
        const errorMessage = error.response.data.message || 'Failed to create payment token';
        console.error('Moneyspec API error response:', JSON.stringify(error.response.data, null, 2));
        throw new Error(`Moneyspec API Error: ${errorMessage}`);
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(`Cannot connect to Moneyspec API at ${this.baseUrl}. Please check MONEYSPEC_BASE_URL configuration.`);
      }
      
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        throw new Error(`Request timeout when calling Moneyspec API. Please check your network connection.`);
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

      // Create payment token
      console.log('🔑 Creating payment token...');
      let token: string;
      try {
        token = await this.createPaymentToken(order);
        console.log('✅ Payment token created:', token.substring(0, 20) + '...');
      } catch (tokenError: any) {
        console.error('❌ Failed to create payment token:', tokenError);
        // If token creation fails, use fallback mode
        console.warn('⚠️  Falling back to fallback mode due to token creation error');
        return this.createPaymentFallback(order, method);
      }

      // Get payment options
      console.log('📋 Getting payment options...');
      let options: any;
      try {
        options = await this.getPaymentOptions(token);
        console.log('✅ Payment options retrieved');
      } catch (optionsError: any) {
        console.error('❌ Failed to get payment options:', optionsError);
        // Continue without options - frontend can still use the token
        options = null;
      }

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

