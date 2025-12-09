import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database';
import { Order, Payment, PaymentResponse, CreatePaymentRequest } from '../types';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Payment Service - Moneyspace Integration
 * 
 * รองรับ 2 ช่องทาง:
 * 1. Credit Card Payment - payment_type: "card"
 * 2. PromptPay QR Payment - payment_type: "qrnone"
 * 
 * ใช้ endpoint เดียวกัน: /payment/CreateTransaction
 * แยกด้วย parameter payment_type
 */
class PaymentService {
  private baseUrl: string;
  private moneyspecSecretId: string;
  private moneyspecSecretKey: string;

  constructor() {
    this.moneyspecSecretId = process.env.MONEYSPEC_SECRET_ID || process.env.MONEYSPACE_SECRET_ID || '';
    this.moneyspecSecretKey = process.env.MONEYSPEC_SECRET_KEY || process.env.MONEYSPACE_SECRET_KEY || '';
    this.baseUrl = process.env.MONEYSPEC_BASE_URL || process.env.MONEYSPACE_BASE_URL || 'https://a.moneyspace.net';
    
    console.log('🔐 Payment Service Configuration:');
    console.log(`  Base URL: ${this.baseUrl}`);
    console.log(`  Secret ID: ${this.moneyspecSecretId ? '✅ Configured (' + this.moneyspecSecretId.substring(0, 8) + '...)' : '❌ Not configured'}`);
    console.log(`  Secret Key: ${this.moneyspecSecretKey ? '✅ Configured (' + this.moneyspecSecretKey.substring(0, 8) + '...)' : '❌ Not configured'}`);
  }

  /**
   * สร้าง Payment Transaction (รองรับทั้ง Card และ QR)
   * Endpoint: /payment/CreateTransaction
   * 
   * @param order - Order ที่ต้องการสร้างการชำระเงิน
   * @param method - วิธีชำระเงิน: 'qr' = PromptPay QR, 'card' = Credit Card
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
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid amount: ${order.total_amount}`);
      }

      const formattedAmount = parseFloat(amount.toFixed(2));

      // Parse customer name
      const nameParts = (order.customer_name || '').trim().split(/\s+/);
      const firstname = nameParts[0] || '';
      const lastname = nameParts.slice(1).join(' ') || '';

      // Validate order_id - alphanumeric only, max 20 chars
      let orderId = order.order_number.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      if (!orderId) {
        orderId = `ORD${order.id}`.substring(0, 20);
      }

      // กำหนด payment_type ตาม method
      // - "card" สำหรับบัตรเครดิต/เดบิต
      // - "qrnone" สำหรับ PromptPay QR
      const paymentType = method === 'card' ? 'card' : 'qrnone';

      // Build request body ตาม Moneyspace API documentation
      const requestBody: any = {
        // Required fields
        secret_id: this.moneyspecSecretId,
        secret_key: this.moneyspecSecretKey,
        order_id: orderId,
        amount: formattedAmount,
        payment_type: paymentType, // แยก card หรือ qrnone
        feeType: 'include', // Merchant จ่ายค่าธรรมเนียม
        success_Url: `${frontendUrl}/payment/result?status=success`,
        fail_Url: `${frontendUrl}/payment/result?status=fail`,
        cancel_Url: `${frontendUrl}/payment/result?status=cancel`,
        
        // Optional fields
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
        language: 'th',
      };
      
      // Remove empty optional fields
      if (!requestBody.firstname) delete requestBody.firstname;
      if (!requestBody.lastname) delete requestBody.lastname;
      if (!requestBody.email) delete requestBody.email;
      if (!requestBody.phone) delete requestBody.phone;
      if (!requestBody.address) delete requestBody.address;

      console.log(`${method === 'card' ? '💳' : '📱'} Creating ${method.toUpperCase()} Payment:`, {
        order_id: requestBody.order_id,
        amount: requestBody.amount,
        payment_type: requestBody.payment_type,
        customer: `${requestBody.firstname} ${requestBody.lastname}`.trim(),
      });

      // Log request body (hide secret_key)
      const logBody = { ...requestBody };
      if (logBody.secret_key) {
        logBody.secret_key = '***HIDDEN***';
      }
      console.log('📤 Request body:', JSON.stringify(logBody, null, 2));

      // Call Moneyspace API - ใช้ endpoint เดียวกัน
      const apiUrl = `${this.baseUrl}/payment/CreateTransaction`;
      console.log('📡 Calling Moneyspace API:', apiUrl);
      
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
      
      console.log('✅ Moneyspace API response:', {
        httpStatus: response.status,
        responseType: Array.isArray(response.data) ? 'array' : typeof response.data,
      });

      // Handle response - Moneyspace returns array
      let responseData: any;
      if (Array.isArray(response.data)) {
        if (response.data.length > 0) {
          responseData = response.data[0];
        } else {
          throw new Error('Moneyspace API returned empty array');
        }
      } else {
        responseData = response.data;
      }

      // Check for error
      if (responseData.status === 'error') {
        const errorMsg = responseData.description || responseData.message || 'Unknown error';
        console.error('❌ Moneyspace API error:', errorMsg);
        console.error('Full error response:', JSON.stringify(responseData, null, 2));
        throw new Error(`Moneyspace API Error: ${errorMsg}`);
      }

      // Check for success
      if (responseData.status === 'success') {
        const result: { transactionId: string; qrCodeUrl?: string; paymentUrl?: string } = {
          transactionId: responseData.transaction_ID,
        };

        if (method === 'qr') {
          // QR Payment - มี image_qrprom
          result.qrCodeUrl = responseData.image_qrprom;
          result.paymentUrl = responseData.image_qrprom;
          console.log('✅ QR Payment created:', {
            transactionId: result.transactionId,
            hasQrCode: !!result.qrCodeUrl,
          });
        } else {
          // Card Payment - มี link_payment
          result.paymentUrl = responseData.link_payment;
          console.log('✅ Card Payment created:', {
            transactionId: result.transactionId,
            paymentUrl: result.paymentUrl,
          });
        }

        return result;
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
      });
      
      if (error.response?.data) {
        const errorData = Array.isArray(error.response.data) 
          ? error.response.data[0] 
          : error.response.data;
        const errorMessage = errorData.message || errorData.description || 'Failed to create payment transaction';
        console.error('Moneyspace API error response:', JSON.stringify(errorData, null, 2));
        throw new Error(`Moneyspace API Error: ${errorMessage}`);
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(`Cannot connect to Moneyspace API at ${this.baseUrl}. Please check MONEYSPEC_BASE_URL configuration.`);
      }
      
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        throw new Error(`Request timeout when calling Moneyspace API. Please check your network connection.`);
      }
      
      throw new Error(`Failed to create payment transaction: ${error.message}`);
    }
  }

  /**
   * Create a payment session with Moneyspace
   * 
   * @param order - The order to create payment for
   * @param method - Payment method: 'qr' for PromptPay QR or 'card' for credit/debit card
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

      // Check if Moneyspace credentials are configured
      if (!this.moneyspecSecretId || !this.moneyspecSecretKey) {
        console.warn('⚠️  Moneyspace credentials not configured. Using fallback mode.');
        console.warn('⚠️  Please set MONEYSPEC_SECRET_ID and MONEYSPEC_SECRET_KEY in .env file.');
        return this.createPaymentFallback(order, method);
      }

      // Create payment record in database first
      console.log('💾 Creating payment record in database...');
      const paymentId = await this.createPaymentRecord(
        order.id,
        method === 'qr' ? 'promptpay' : 'card',
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
          hasPaymentUrl: !!paymentResult.paymentUrl,
        });
      } catch (tokenError: any) {
        console.error('❌ Failed to create payment transaction:', tokenError);
        console.warn('⚠️  Falling back to fallback mode due to transaction creation error');
        return this.createPaymentFallback(order, method);
      }

      // Return payment response
      if (method === 'qr') {
        // QR Payment - return QR code URL
        const paymentUrl: string = paymentResult.paymentUrl || paymentResult.qrCodeUrl || '';
        if (!paymentUrl) {
          throw new Error('QR code URL not returned from Moneyspace API');
        }
        return {
          paymentUrl: paymentUrl,
          qrCode: paymentResult.qrCodeUrl,
          transactionId: paymentResult.transactionId,
        };
      } else {
        // Card Payment - return payment link
        const paymentUrl: string = paymentResult.paymentUrl || '';
        if (!paymentUrl) {
          throw new Error('Payment URL not returned from Moneyspace API');
        }
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
      
      // Fallback on API errors
      if (error.message?.includes('Moneyspace') || error.response?.status >= 400) {
        console.warn('⚠️  Moneyspace API error. Using fallback mode.');
        return this.createPaymentFallback(order, method);
      }
      
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Fallback payment creation for development/testing
   */
  private async createPaymentFallback(
    order: Order,
    method: 'qr' | 'card'
  ): Promise<PaymentResponse> {
    const paymentId = await this.createPaymentRecord(
      order.id,
      method === 'qr' ? 'promptpay' : 'card',
      order.total_amount
    );

    const mockToken = `MOCK-${paymentId}-${Date.now()}`;
    
    console.warn('⚠️  Payment created in fallback mode. Moneyspace credentials not configured.');
    console.warn('⚠️  To enable real payments, set MONEYSPEC_SECRET_ID and MONEYSPEC_SECRET_KEY in .env file.');
    
    return {
      paymentUrl: `#fallback-${mockToken}`,
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
   * Handle Moneyspace webhook
   */
  async handleWebhook(payload: any): Promise<{ success: boolean; orderId?: number }> {
    try {
      console.log('🔍 [Webhook Handler] Starting webhook processing:', {
        payload: JSON.stringify(payload, null, 2),
        timestamp: new Date().toISOString(),
      });

      const transactionId = payload.transaction_id || payload.transectionID || payload.id;
      const orderNumber = payload.order_id || payload.orderid || payload.order_number;
      const status = payload.status || payload.payment_status;
      const amount = payload.amount;

      console.log('🔍 [Webhook Handler] Extracted data:', {
        transactionId,
        orderNumber,
        status,
        amount,
        allPayloadKeys: Object.keys(payload),
      });

      console.log('🔍 [Webhook Handler] Looking for order:', orderNumber);
      const orderResult = await query(
        `SELECT id FROM orders WHERE order_number = ?`,
        [orderNumber]
      );

      if (orderResult.rows.length === 0) {
        console.error('❌ [Webhook Handler] Order not found:', orderNumber);
        throw new Error(`Order not found: ${orderNumber}`);
      }

      const orderId = orderResult.rows[0].id;
      console.log('✅ [Webhook Handler] Order found:', {
        orderId,
        orderNumber,
      });

      const paymentStatus = status === 'success' || status === 'paysuccess' || status === 'OK' ? 'success' : 'failed';
      const orderPaymentStatus = paymentStatus === 'success' ? 'paid' : 'failed';

      console.log('💾 [Webhook Handler] Updating payment and order status:', {
        orderId,
        paymentStatus,
        orderPaymentStatus,
        transactionId,
      });

      await query(
        `UPDATE payments 
         SET gateway_transaction_id = ?, 
             status = ?, 
             raw_response = ?,
             updated_at = NOW()
         WHERE order_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [transactionId, paymentStatus, JSON.stringify(payload), orderId]
      );

      await query(
        `UPDATE orders 
         SET payment_status = ?, updated_at = NOW()
         WHERE id = ?`,
        [orderPaymentStatus, orderId]
      );

      console.log('✅ [Webhook Handler] Database updated successfully');

      // Check if payment is successful (support multiple status formats)
      const isPaymentSuccess = status === 'success' || status === 'paysuccess' || status === 'OK';
      
      console.log('💰 [Webhook Handler] Payment status check:', {
        originalStatus: status,
        isPaymentSuccess,
        willSendSMS: isPaymentSuccess,
      });

      if (isPaymentSuccess) {
        console.log('✅ [Payment Webhook] Payment successful, preparing to send SMS...');
        const orderResult = await query(
          `SELECT customer_phone, order_number FROM orders WHERE id = ?`,
          [orderId]
        );
        if (orderResult.rows.length > 0) {
          const { customer_phone, order_number } = orderResult.rows[0];
          
          console.log('📞 [Payment Webhook] Customer info retrieved:', {
            orderId: orderId,
            orderNumber: order_number,
            customerPhone: customer_phone ? customer_phone.substring(0, 4) + '****' + customer_phone.substring(customer_phone.length - 3) : 'N/A',
            hasPhone: !!customer_phone,
          });
          
          // Send payment success SMS via MailBIT
          // Normalize phone number to MailBIT format (6681xxxxxxx)
          let normalizedPhone = customer_phone;
          if (normalizedPhone) {
            const originalPhone = normalizedPhone;
            // Remove spaces and dashes
            normalizedPhone = normalizedPhone.replace(/\s+/g, '').replace(/-/g, '');
            
            console.log('🔄 [Payment Webhook] Normalizing phone number:', {
              original: originalPhone,
              afterClean: normalizedPhone,
            });
            
            // Convert to MailBIT format: 6681xxxxxxx
            // If starts with 0, replace with 66
            if (normalizedPhone.startsWith('0')) {
              normalizedPhone = '66' + normalizedPhone.substring(1);
              console.log('🔄 [Payment Webhook] Phone starts with 0, replaced with 66:', normalizedPhone);
            } else if (!normalizedPhone.startsWith('66')) {
              // If doesn't start with 66, add it
              normalizedPhone = '66' + normalizedPhone;
              console.log('🔄 [Payment Webhook] Phone doesn\'t start with 66, added 66:', normalizedPhone);
            }
            
            console.log('📱 [Payment Webhook] Final normalized phone:', normalizedPhone);
            console.log('📱 [Payment Webhook] Order number for SMS:', order_number);
            
            // Send SMS (non-blocking - don't wait for completion)
            console.log('🚀 [Payment Webhook] Initiating SMS send...');
            const { mailbitSmsService } = await import('./mailbitSmsService');
            mailbitSmsService
              .sendPaymentSuccessSms({
                phone: normalizedPhone,
                orderId: order_number,
              })
              .then((result) => {
                console.log('✅ [Payment Webhook] SMS sent successfully:', {
                  orderNumber: order_number,
                  phone: normalizedPhone.substring(0, 4) + '****' + normalizedPhone.substring(normalizedPhone.length - 3),
                  result: result,
                });
              })
              .catch((error) => {
                // Log error but don't fail the webhook
                console.error('❌ [Payment Webhook] Failed to send payment success SMS:', {
                  error: error.message,
                  orderNumber: order_number,
                  phone: normalizedPhone.substring(0, 4) + '****' + normalizedPhone.substring(normalizedPhone.length - 3),
                  stack: error.stack,
                });
              });
          } else {
            console.warn('⚠️  [Payment Webhook] No customer phone number found, skipping SMS:', {
              orderId: orderId,
              orderNumber: order_number,
            });
          }
        } else {
          console.warn('⚠️  [Payment Webhook] Order not found for SMS sending:', {
            orderId: orderId,
          });
        }
      } else {
        console.log('ℹ️  [Payment Webhook] Payment status is not success, skipping SMS:', {
          originalStatus: status,
          orderId: orderId,
        });
      }

      return { success: true, orderId };
    } catch (error: any) {
      console.error('Webhook handling error:', error);
      return { success: false };
    }
  }

  /**
   * Verify Moneyspace webhook signature
   */
  async verifyMoneyspecWebhook(payload: any, signature: string): Promise<boolean> {
    try {
      console.log('🔐 [Signature Verification] Starting verification:', {
        hasSecretId: !!this.moneyspecSecretId,
        hasSecretKey: !!this.moneyspecSecretKey,
        hasSignature: !!signature,
        signatureLength: signature?.length || 0,
      });

      if (!this.moneyspecSecretId || !this.moneyspecSecretKey) {
        console.warn('⚠️  [Signature Verification] Moneyspace credentials not configured. Skipping signature verification.');
        return true;
      }

      if (signature && signature.length > 0) {
        console.log('✅ [Signature Verification] Signature provided, accepting webhook');
        return true;
      }

      console.warn('⚠️  [Signature Verification] No signature provided');
      return false;
    } catch (error) {
      console.error('❌ [Signature Verification] Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Get Moneyspace configuration
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
      secretKey: this.moneyspecSecretKey ? '***' + this.moneyspecSecretKey.slice(-4) : '',
    };
  }
}

export const paymentService = new PaymentService();