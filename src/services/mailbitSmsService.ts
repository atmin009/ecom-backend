import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * SMS Service - Supports Thai characters via Unicode
 * 
 * Service for sending SMS via send-sms.in.th API
 * API Documentation: https://api.send-sms.in.th/api/v2/SendSMS
 * 
 * Format: GET https://api.send-sms.in.th/api/v2/SendSMS?SenderId=...&Is_Unicode=true&Message=...&MobileNumbers=...&ApiKey=...&ClientId=...
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

    // Use new API endpoint: https://api.send-sms.in.th
    this.baseUrl = baseUrl || 'https://api.send-sms.in.th';
    this.apiKey = apiKey || '';
    this.clientId = clientId || '';
    this.senderId = senderId || 'ABLEMEN';

    console.log('📋 SMS Service Configuration:');
    console.log(`  Base URL: ${this.baseUrl} (from ${baseUrl ? '.env' : 'default'})`);
    console.log(`  Sender ID: ${this.senderId} (from ${senderId ? '.env' : 'default'})`);
    console.log(`  API Key: ${this.apiKey ? '✅ Configured (' + this.apiKey.substring(0, 8) + '...)' : '❌ Not configured'}`);
    console.log(`  Client ID: ${this.clientId ? '✅ Configured (' + this.clientId.substring(0, 8) + '...)' : '❌ Not configured'}`);

    if (!this.apiKey || !this.clientId) {
      console.warn('⚠️  SMS credentials not fully configured. Please set MAILBIT_API_KEY and MAILBIT_CLIENT_ID in .env file.');
    }
  }

  /**
   * Encode Thai characters properly for the API
   * The API expects Thai characters to NOT be percent-encoded
   * but spaces and special characters should be encoded
   */
  private encodeThaiMessage(message: string): string {
    // Use URLSearchParams which handles Thai characters correctly
    const params = new URLSearchParams();
    params.append('Message', message);
    const encoded = params.toString().split('=')[1]; // Extract the encoded value
    return encoded;
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
          'SMS credentials not configured. Please set MAILBIT_API_KEY and MAILBIT_CLIENT_ID in .env'
        );
      }

      // SMS message in Thai
      const message = `ระบบได้รับการชำระเงินเรียบร้อย ขอบคุณที่เลือกฟิล์มกระจกโฟกัส เลขที่คำสั่งซื้อ ${orderId} กำลังดำเนินการจัดส่ง`;

      console.log('📱 [SMS] Starting SMS send:', {
        phone: phone,
        orderId: orderId,
        messageLength: message.length,
        messagePreview: message.substring(0, 50) + '...',
      });

      // Build URL with query parameters
      // Use URLSearchParams for proper Thai character encoding
      const params = new URLSearchParams({
        SenderId: this.senderId,
        Is_Unicode: 'true',
        Message: message,
        MobileNumbers: phone,
        ApiKey: this.apiKey,
        ClientId: this.clientId,
      });

      const apiUrl = `${this.baseUrl}/api/v2/SendSMS?${params.toString()}`;

      console.log('📤 [SMS] Sending via GET request with Unicode support');
      console.log('🌐 [SMS] API URL (sanitized):', 
        apiUrl.replace(this.apiKey, '***HIDDEN***').replace(this.clientId, '***HIDDEN***'));
      console.log('📝 [SMS] Message encoding:', {
        original: message.substring(0, 30) + '...',
        forUrl: params.get('Message')?.substring(0, 50) + '...',
      });

      // Send GET request
      const response = await axios.get(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        timeout: 30000,
      });

      console.log('✅ [SMS] Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      // Check for success (adjust based on actual API response format)
      if (response.data.ErrorCode === 0 || response.status === 200) {
        console.log('✅ [SMS] SMS sent successfully!');
      } else {
        console.error('❌ [SMS] API returned error:', response.data);
      }

      return response.data;

    } catch (error: any) {
      console.error('❌ [SMS] Error:', {
        message: error.message,
        orderId: orderId,
        phone: phone.substring(0, 4) + '****' + phone.substring(phone.length - 3),
      });

      if (error.response) {
        console.error('❌ [SMS] API error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
        throw new Error(
          error.response.data?.ErrorDescription || 
          error.response.data?.error ||
          `SMS API error: ${error.response.status} ${error.response.statusText}`
        );
      } else if (error.request) {
        console.error('❌ [SMS] No response from API:', {
          url: error.config?.url?.replace(this.apiKey, '***HIDDEN***'),
        });
        throw new Error('No response from SMS API. Check network connection.');
      } else {
        throw new Error(`Failed to send SMS: ${error.message}`);
      }
    }
  }

}

export const mailbitSmsService = new MailbitSmsService();