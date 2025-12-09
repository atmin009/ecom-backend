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
    // Load environment variables from .env file (via dotenv.config() at top of file)
    // These values are read from process.env which dotenv populates from .env file
    const baseUrl = process.env.MAILBIT_BASE_URL;
    const apiKey = process.env.MAILBIT_API_KEY;
    const clientId = process.env.MAILBIT_CLIENT_ID;
    const senderId = process.env.MAILBIT_SENDER_ID;

    // Set values with defaults if not in .env
    this.baseUrl = baseUrl || 'http://dplus.mailbit.co.th';
    this.apiKey = apiKey || 'AU1HC4ePG3eCR0pOBzK01xmJ/4i+wbShEah1RlYSYuE=';
    this.clientId = clientId || '63d4a713-08f1-4978-bdf5-7e9eb4409875';
    this.senderId = senderId || 'ABLEMEN';

    // Log configuration on startup
    console.log('📋 MailBIT SMS Service Configuration (from .env):');
    console.log(`  Base URL: ${this.baseUrl} ${baseUrl ? '(from .env)' : '(default)'}`);
    console.log(`  Sender ID: ${this.senderId} ${senderId ? '(from .env)' : '(default)'}`);
    console.log(`  API Key: ${this.apiKey ? '✅ Configured from .env (' + this.apiKey.substring(0, 8) + '...)' : '❌ Not configured in .env'}`);
    console.log(`  Client ID: ${this.clientId ? '✅ Configured from .env (' + this.clientId.substring(0, 8) + '...)' : '❌ Not configured in .env'}`);

    // Validate required configuration
    if (!this.apiKey || !this.clientId) {
      console.warn('⚠️  MailBIT SMS credentials not fully configured.');
      console.warn('⚠️  Please set the following in .env file:');
      console.warn('     MAILBIT_API_KEY=your_api_key');
      console.warn('     MAILBIT_CLIENT_ID=your_client_id');
      console.warn('     MAILBIT_SENDER_ID=Focus (optional, defaults to "Focus")');
      console.warn('     MAILBIT_BASE_URL=http://dplus.mailbit.co.th (optional, has default)');
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

      // Build API URL
      const apiUrl = `${this.baseUrl}/api/v2/SendSMS`;

      // Prepare JSON payload according to MailBIT API v2 documentation
      // DataCoding: "08" = UCS2 (Unicode) - supports Thai characters
      const payload = {
        ApiKey: this.apiKey,
        ClientId: this.clientId,
        SenderId: this.senderId,
        Message: message, // UTF-8 message (will be sent as Unicode via DataCoding)
        MobileNumbers: phone,
        Is_Unicode: true, // Optional: deprecated but kept for compatibility
        Is_Flash: false, // Optional: false for normal SMS
        DataCoding: '08', // "08" = UCS2 (Unicode) - supports Thai characters
      };

      // Log request details (hide sensitive data)
      const logPayload = {
        ...payload,
        ApiKey: this.apiKey ? this.apiKey.substring(0, 8) + '***' : 'NOT SET',
        ClientId: this.clientId ? this.clientId.substring(0, 8) + '***' : 'NOT SET',
        Message: message,
        MobileNumbers: phone.substring(0, 4) + '****' + phone.substring(phone.length - 3),
      };
      console.log('📤 [MailBIT SMS] Request payload:', JSON.stringify(logPayload, null, 2));
      console.log('🌐 [MailBIT SMS] Calling API (POST):', apiUrl);
      console.log('⏱️  [MailBIT SMS] Request timestamp:', new Date().toISOString());
      console.log('📝 [MailBIT SMS] Using DataCoding: 08 (UCS2/Unicode) for Thai characters');

      // Call MailBIT API v2 using POST request with JSON body
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
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

