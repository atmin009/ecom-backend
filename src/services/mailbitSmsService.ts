import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MailBIT SMS Service - Fixed for Thai characters
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
    const baseUrl = process.env.MAILBIT_BASE_URL;
    const apiKey = process.env.MAILBIT_API_KEY;
    const clientId = process.env.MAILBIT_CLIENT_ID;
    const senderId = process.env.MAILBIT_SENDER_ID;

    this.baseUrl = baseUrl || 'http://dplus.mailbit.co.th';
    this.apiKey = apiKey || 'AU1HC4ePG3eCR0pOBzK01xmJ/4i+wbShEah1RlYSYuE=';
    this.clientId = clientId || '63d4a713-08f1-4978-bdf5-7e9eb4409875';
    this.senderId = senderId || 'ABLEMEN';

    console.log('📋 MailBIT SMS Service Configuration:');
    console.log(`  Base URL: ${this.baseUrl}`);
    console.log(`  Sender ID: ${this.senderId}`);
    console.log(`  API Key: ${this.apiKey ? '✅ Configured (' + this.apiKey.substring(0, 8) + '...)' : '❌ Not configured'}`);
    console.log(`  Client ID: ${this.clientId ? '✅ Configured (' + this.clientId.substring(0, 8) + '...)' : '❌ Not configured'}`);

    if (!this.apiKey || !this.clientId) {
      console.warn('⚠️  MailBIT SMS credentials not fully configured.');
    }
  }

  /**
   * Send payment success SMS notification
   * 
   * @param phone - Customer phone number in format "6681xxxxxxx"
   * @param orderId - Order number string (e.g., "ORD-20251209-20971")
   * @returns MailBIT API response
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

      const phoneRegex = /^66\d{9}$/;
      if (!phoneRegex.test(phone)) {
        throw new Error(
          `Invalid phone number format. Expected: 6681xxxxxxx, got: ${phone}`
        );
      }

      if (!this.apiKey || !this.clientId) {
        throw new Error(
          'MailBIT credentials not configured. Please set MAILBIT_API_KEY and MAILBIT_CLIENT_ID in .env'
        );
      }

      // SMS message in Thai
      const message = `ระบบได้รับการชำระเงินเรียบร้อย ขอบคุณที่เลือกฟิล์มกระจกโฟกัส เลขที่คำสั่งซื้อ ${orderId} กำลังดำเนินการจัดส่ง`;

      console.log('📱 [MailBIT SMS] Starting SMS send:', {
        phone: phone,
        orderId: orderId,
        messageLength: message.length,
      });

      const apiUrl = `${this.baseUrl}/api/v2/SendSMS`;

      // Method 1: Try with Unicode (UTF-8) - RECOMMENDED
      const payloadUnicode = {
        ApiKey: this.apiKey,
        ClientId: this.clientId,
        SenderId: this.senderId,
        Message: message, // Use UTF-8 directly
        MobileNumbers: phone,
        Is_Unicode: true, // TRUE for Thai characters
        Is_Flash: false,
      };

      console.log('📤 [MailBIT SMS] Sending with UTF-8 Unicode');
      console.log('🌐 [MailBIT SMS] API URL:', apiUrl);

      const response = await axios.post(apiUrl, payloadUnicode, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json',
        },
        timeout: 30000,
      });

      console.log('✅ [MailBIT SMS] Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      // Check for success
      if (response.data.ErrorCode === 0) {
        console.log('✅ [MailBIT SMS] SMS sent successfully!');
      } else {
        console.error('❌ [MailBIT SMS] API returned error:', response.data);
      }

      return response.data;

    } catch (error: any) {
      console.error('❌ [MailBIT SMS] Error:', {
        message: error.message,
        orderId: orderId,
      });

      if (error.response) {
        console.error('❌ [MailBIT SMS] API error:', {
          status: error.response.status,
          data: error.response.data,
        });
        throw new Error(
          error.response.data?.ErrorDescription || 
          `MailBIT API error: ${error.response.status}`
        );
      } else if (error.request) {
        throw new Error('No response from MailBIT API. Check network connection.');
      } else {
        throw new Error(`Failed to send SMS: ${error.message}`);
      }
    }
  }

  /**
   * Alternative method: Send with GET request (if POST doesn't work)
   * Some MailBIT implementations prefer GET requests
   */
  async sendPaymentSuccessSmsViaGET({
    phone,
    orderId,
  }: {
    phone: string;
    orderId: string;
  }): Promise<any> {
    try {
      const message = `ระบบได้รับการชำระเงินเรียบร้อย ขอบคุณที่เลือกฟิล์มกระจกโฟกัส เลขที่คำสั่งซื้อ ${orderId} กำลังดำเนินการจัดส่ง`;
      
      console.log('📱 [MailBIT SMS] Trying GET method...');

      // Build URL with query parameters
      const params = new URLSearchParams({
        ApiKey: this.apiKey,
        ClientId: this.clientId,
        SenderId: this.senderId,
        message: message, // URLSearchParams will encode UTF-8 automatically
        mobileNumbers: phone,
        fl: '0', // 0 = normal SMS, 1 = flash SMS
      });

      const apiUrl = `${this.baseUrl}/api/v2/SendSMS?${params.toString()}`;

      console.log('🌐 [MailBIT SMS] GET URL (encoded)');

      const response = await axios.get(apiUrl, {
        headers: {
          'Accept': 'application/json',
        },
        timeout: 30000,
      });

      console.log('✅ [MailBIT SMS] Response:', response.data);
      return response.data;

    } catch (error: any) {
      console.error('❌ [MailBIT SMS] GET method error:', error.message);
      throw error;
    }
  }
}

export const mailbitSmsService = new MailbitSmsService();