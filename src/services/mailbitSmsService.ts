import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MailBIT SMS Service
 * 
 * Service for sending SMS via MailBIT API
 * Documentation: https://sms.mailbit.co.th
 */
class MailbitSmsService {
  private baseUrl: string;
  private apiKey: string;
  private clientId: string;
  private senderId: string;

  constructor() {
    this.baseUrl = process.env.MAILBIT_BASE_URL || 'https://sms.mailbit.co.th';
    this.apiKey = process.env.MAILBIT_API_KEY || '';
    this.clientId = process.env.MAILBIT_CLIENT_ID || '';
    this.senderId = process.env.MAILBIT_SENDER_ID || 'FocusShield';

    // Log configuration on startup
    console.log('📋 MailBIT SMS Service Configuration:');
    console.log(`  Base URL: ${this.baseUrl}`);
    console.log(`  Sender ID: ${this.senderId}`);
    console.log(`  API Key: ${this.apiKey ? '✅ Configured (' + this.apiKey.substring(0, 8) + '...)' : '❌ Not configured'}`);
    console.log(`  Client ID: ${this.clientId ? '✅ Configured (' + this.clientId.substring(0, 8) + '...)' : '❌ Not configured'}`);

    // Validate required configuration
    if (!this.apiKey || !this.clientId) {
      console.warn('⚠️  MailBIT SMS credentials not fully configured.');
      console.warn('⚠️  Please set MAILBIT_API_KEY and MAILBIT_CLIENT_ID in .env file.');
    }
  }

  /**
   * Send payment success SMS notification
   * 
   * @param phone - Customer phone number in format "6681xxxxxxx" (Thai format with country code)
   * @param orderId - Order number string (e.g., "FS123456")
   * @returns MailBIT API response
   * @throws Error if SMS sending fails
   */
  async sendPaymentSuccessSms({
    phone,
    orderId,
  }: {
    phone: string;
    orderId: string;
  }): Promise<any> {
    try {
      // Validate inputs
      if (!phone || !orderId) {
        throw new Error('Phone number and order ID are required');
      }

      // Validate phone format (should be in format 6681xxxxxxx)
      const phoneRegex = /^66\d{9}$/;
      if (!phoneRegex.test(phone)) {
        throw new Error(
          `Invalid phone number format. Expected format: 6681xxxxxxx, got: ${phone}`
        );
      }

      // Validate order ID
      if (typeof orderId !== 'string' || orderId.trim().length === 0) {
        throw new Error('Order ID must be a non-empty string');
      }

      // Check if credentials are configured
      if (!this.apiKey || !this.clientId) {
        throw new Error(
          'MailBIT credentials not configured. Please set MAILBIT_API_KEY and MAILBIT_CLIENT_ID in .env file.'
        );
      }

      // Build SMS message with order ID
      const message = `ระบบได้รับการชำระเงินเรียบร้อย ขอบคุณที่เลือกฟิล์มกระจกโฟกัส เลขที่คำสั่งซื้อ ${orderId} กำลังดำเนินการจัดส่ง`;

      console.log('📱 [MailBIT SMS] Starting SMS send process:', {
        phone: phone,
        orderId: orderId,
        messagePreview: message.substring(0, 50) + '...',
        messageLength: message.length,
      });

      // Prepare payload for MailBIT API
      const payload = {
        senderId: this.senderId,
        is_Unicode: true,
        is_Flash: false,
        dataCoding: 0,
        schedTime: null,
        groupId: null,
        message: message,
        mobileNumbers: phone,
        serviceId: null,
        coRelator: null,
        linkId: null,
        principleEntityId: null,
        templateId: null,
        apiKey: this.apiKey,
        clientId: this.clientId,
      };

      // Log payload (hide sensitive data)
      const logPayload = {
        ...payload,
        apiKey: payload.apiKey ? payload.apiKey.substring(0, 8) + '***' : 'NOT SET',
        clientId: payload.clientId ? payload.clientId.substring(0, 8) + '***' : 'NOT SET',
        message: message,
      };
      console.log('📤 [MailBIT SMS] Request payload:', JSON.stringify(logPayload, null, 2));

      // Call MailBIT API
      const apiUrl = `${this.baseUrl}/api/v3/SendSMS`;
      console.log('🌐 [MailBIT SMS] Calling API:', apiUrl);
      console.log('⏱️  [MailBIT SMS] Request timestamp:', new Date().toISOString());

      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      });

      console.log('✅ [MailBIT SMS] API Response received:', {
        status: response.status,
        statusText: response.statusText,
        orderId: orderId,
        phone: phone.substring(0, 4) + '****' + phone.substring(phone.length - 3),
        responseData: JSON.stringify(response.data),
      });

      // Log full response for debugging
      console.log('📥 [MailBIT SMS] Full API response:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error: any) {
      console.error('❌ [MailBIT SMS] Error occurred:', {
        error: error.message,
        errorType: error.constructor.name,
        phone: phone ? phone.substring(0, 4) + '****' + phone.substring(phone.length - 3) : 'N/A',
        orderId: orderId,
        timestamp: new Date().toISOString(),
      });

      // Handle axios errors
      if (error.response) {
        // API responded with error status
        const errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `MailBIT API error: ${error.response.status} ${error.response.statusText}`;
        console.error('❌ [MailBIT SMS] API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: JSON.stringify(error.response.data, null, 2),
        });
        throw new Error(errorMessage);
      } else if (error.request) {
        // Request was made but no response received
        console.error('❌ [MailBIT SMS] No response from API:', {
          requestUrl: error.config?.url,
          requestMethod: error.config?.method,
          timeout: error.code === 'ECONNABORTED' ? 'Request timeout' : 'Unknown',
        });
        throw new Error(
          'No response from MailBIT API. Please check your network connection and API endpoint.'
        );
      } else {
        // Error in request setup
        console.error('❌ [MailBIT SMS] Request setup error:', {
          message: error.message,
          stack: error.stack,
        });
        throw new Error(`Failed to send SMS: ${error.message}`);
      }
    }
  }
}

export const mailbitSmsService = new MailbitSmsService();

