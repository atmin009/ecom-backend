import axios from 'axios';
import { query } from '../config/database';
import { SMSLog } from '../types';
import dotenv from 'dotenv';

dotenv.config();

/**
 * SMS Service
 * 
 * This service handles SMS sending via external SMS gateway.
 * Replace the implementation with your actual SMS provider's API.
 * 
 * Common SMS providers:
 * - Twilio
 * - AWS SNS
 * - Nexmo/Vonage
 * - Local Thai providers (e.g., ThaiBulkSMS, SMS Gateway Thailand)
 */
class SMSService {
  private apiUrl: string;
  private apiKey: string;
  private senderName: string;

  constructor() {
    this.apiUrl = process.env.SMS_API_URL || '';
    this.apiKey = process.env.SMS_API_KEY || '';
    this.senderName = process.env.SMS_SENDER_NAME || 'Shop';
  }

  /**
   * Send OTP SMS
   */
  async sendOTP(phone: string, otpCode: string): Promise<boolean> {
    const message = `Your verification code is: ${otpCode}. Valid for 5 minutes.`;
    return this.sendSMS(phone, message, 'otp');
  }

  /**
   * Send notification SMS (e.g., payment success)
   */
  async sendNotification(phone: string, message: string): Promise<boolean> {
    return this.sendSMS(phone, message, 'other');
  }

  /**
   * Generic SMS sending method
   * 
   * TODO: Replace this implementation with your actual SMS gateway API call.
   * 
   * Example implementation structure:
   * 1. Validate phone number format
   * 2. Call SMS gateway API (POST/PUT request)
   * 3. Handle response and log
   * 4. Return success/failure
   */
  private async sendSMS(
    phone: string,
    message: string,
    type: SMSLog['type']
  ): Promise<boolean> {
    try {
      // Normalize phone number (Thai format: remove leading 0, add +66)
      const normalizedPhone = this.normalizePhone(phone);

      // Log SMS attempt
      const logId = await this.logSMS(phone, message, type, 'sent');

      // TODO: Replace with actual SMS gateway API call
      // Example structure:
      /*
      const response = await axios.post(
        this.apiUrl,
        {
          to: normalizedPhone,
          message: message,
          from: this.senderName,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success || response.status === 200) {
        await this.updateSMSLogStatus(logId, 'sent');
        return true;
      } else {
        await this.updateSMSLogStatus(logId, 'failed');
        return false;
      }
      */

      // PLACEHOLDER: For now, just log and return success
      // In production, implement actual API call above
      console.log(`[SMS] Would send to ${normalizedPhone}: ${message}`);
      console.log(`[SMS] API URL: ${this.apiUrl}`);
      console.log(`[SMS] API Key: ${this.apiKey ? '***' + this.apiKey.slice(-4) : 'NOT SET'}`);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;
    } catch (error: any) {
      console.error('SMS sending error:', error);
      await this.logSMS(phone, message, type, 'failed');
      return false;
    }
  }

  /**
   * Normalize Thai phone number
   * Converts 08xxxxxxxx to +668xxxxxxxx
   */
  private normalizePhone(phone: string): string {
    let normalized = phone.replace(/\s+/g, '').replace(/-/g, '');
    
    // Remove leading 0 and add +66
    if (normalized.startsWith('0')) {
      normalized = '+66' + normalized.substring(1);
    } else if (!normalized.startsWith('+')) {
      normalized = '+66' + normalized;
    }
    
    return normalized;
  }

  /**
   * Log SMS to database
   */
  private async logSMS(
    phone: string,
    message: string,
    type: SMSLog['type'],
    status: SMSLog['status']
  ): Promise<number> {
    try {
      const result = await query(
        `INSERT INTO sms_logs (phone, message, type, status, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [phone, message, type, status]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error logging SMS:', error);
      return 0;
    }
  }

  /**
   * Update SMS log status
   */
  private async updateSMSLogStatus(logId: number, status: SMSLog['status']): Promise<void> {
    try {
      await query(
        `UPDATE sms_logs SET status = ? WHERE id = ?`,
        [status, logId]
      );
    } catch (error) {
      console.error('Error updating SMS log:', error);
    }
  }
}

export const smsService = new SMSService();

