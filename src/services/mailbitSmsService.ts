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

      console.log('📱 Sending payment success SMS via MailBIT:', {
        phone: phone.substring(0, 4) + '****' + phone.substring(phone.length - 3),
        orderId,
        senderId: this.senderId,
        messageLength: message.length,
      });

      // Call MailBIT API
      const apiUrl = `${this.baseUrl}/api/v3/SendSMS`;
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      });

      console.log('✅ MailBIT SMS sent successfully:', {
        status: response.status,
        orderId,
        phone: phone.substring(0, 4) + '****' + phone.substring(phone.length - 3),
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ MailBIT SMS sending error:', {
        error: error.message,
        phone: phone ? phone.substring(0, 4) + '****' + phone.substring(phone.length - 3) : 'N/A',
        orderId,
      });

      // Handle axios errors
      if (error.response) {
        // API responded with error status
        const errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `MailBIT API error: ${error.response.status} ${error.response.statusText}`;
        console.error('MailBIT API error response:', {
          status: error.response.status,
          data: error.response.data,
        });
        throw new Error(errorMessage);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error(
          'No response from MailBIT API. Please check your network connection and API endpoint.'
        );
      } else {
        // Error in request setup
        throw new Error(`Failed to send SMS: ${error.message}`);
      }
    }
  }
}

export const mailbitSmsService = new MailbitSmsService();

