import axios from 'axios';
import dotenv from 'dotenv';
import iconv from 'iconv-lite';

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
    // Support both dplus.mailbit.co.th and sms.mailbit.co.th
    this.baseUrl = process.env.MAILBIT_BASE_URL || 'http://dplus.mailbit.co.th';
    this.apiKey = process.env.MAILBIT_API_KEY || '';
    this.clientId = process.env.MAILBIT_CLIENT_ID || '';
    this.senderId = process.env.MAILBIT_SENDER_ID || 'Focus';

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

      // Convert message from UTF-8 to TIS-620 encoding (like PHP iconv("UTF-8", "TIS-620"))
      // This is required for MailBIT API v2 to display Thai characters correctly
      // iconv-lite supports: 'tis620', 'win874', 'thai' (all are TIS-620 variants)
      let encodedMessage: string;
      try {
        // Try TIS-620 encoding first
        let tis620Buffer: Buffer;
        try {
          tis620Buffer = iconv.encode(message, 'tis620');
        } catch (e) {
          // Fallback to win874 (Windows Thai encoding, compatible with TIS-620)
          try {
            tis620Buffer = iconv.encode(message, 'win874');
          } catch (e2) {
            // Last fallback to thai encoding
            tis620Buffer = iconv.encode(message, 'thai');
          }
        }
        // URL encode the TIS-620 encoded message
        encodedMessage = encodeURIComponent(tis620Buffer.toString('binary'));
        console.log('✅ [MailBIT SMS] Message converted to TIS-620 encoding');
      } catch (encodingError: any) {
        console.warn('⚠️  [MailBIT SMS] TIS-620 encoding failed, falling back to UTF-8:', encodingError.message);
        // Fallback to UTF-8 if TIS-620 encoding fails
        encodedMessage = encodeURIComponent(message);
      }

      // Build API URL with query parameters (GET request like the PHP example)
      // Format: http://dplus.mailbit.co.th/api/v2/SendSMS?ApiKey=...&ClientId=...&SenderId=...&message=...&mobileNumbers=...&fl=0
      const apiUrl = `${this.baseUrl}/api/v2/SendSMS`;
      
      // Build query string manually to use TIS-620 encoded message
      const queryParams = [
        `ApiKey=${encodeURIComponent(this.apiKey)}`,
        `ClientId=${encodeURIComponent(this.clientId)}`,
        `SenderId=${encodeURIComponent(this.senderId)}`,
        `message=${encodedMessage}`,
        `mobileNumbers=${encodeURIComponent(phone)}`,
        `fl=0`,
      ].join('&');

      const fullUrl = `${apiUrl}?${queryParams}`;
      
      console.log('🔗 [MailBIT SMS] Full URL (message encoded):', fullUrl.replace(/message=[^&]+/, 'message=***ENCODED***'));

      // Log request details (hide sensitive data)
      const logParams = {
        ApiKey: this.apiKey ? this.apiKey.substring(0, 8) + '***' : 'NOT SET',
        ClientId: this.clientId ? this.clientId.substring(0, 8) + '***' : 'NOT SET',
        SenderId: this.senderId,
        message: message,
        mobileNumbers: phone.substring(0, 4) + '****' + phone.substring(phone.length - 3),
        fl: '0',
      };
      console.log('📤 [MailBIT SMS] Request parameters:', JSON.stringify(logParams, null, 2));
      console.log('🌐 [MailBIT SMS] Calling API (GET):', apiUrl);
      console.log('⏱️  [MailBIT SMS] Request timestamp:', new Date().toISOString());

      // Call MailBIT API v2 using GET request (like the PHP example)
      const response = await axios.get(fullUrl, {
        headers: {
          'Accept': 'application/json',
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

