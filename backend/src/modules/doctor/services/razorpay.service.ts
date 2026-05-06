import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../../../common/logger';

export class RazorpayService {
  private razorpay: Razorpay | null;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor() {
    this.keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
    this.keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    this.razorpay = this.keyId && this.keySecret
      ? new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret,
        })
      : null;
  }

  async createOrder(amount: number, currency: string = 'INR', receipt: string) {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env');
      }
      // Razorpay expects amount in paise (1 INR = 100 paise)
      const options = {
        amount: Math.round(amount * 100),
        currency,
        receipt,
      };

      const order = await this.razorpay.orders.create(options);
      logger.info({ orderId: order.id, amount, receipt }, 'Razorpay order created');
      return order;
    } catch (error) {
      logger.error({ err: error, amount, receipt }, 'Failed to create Razorpay order');
      throw error;
    }
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    try {
      if (!this.keySecret) {
        logger.warn('Razorpay signature verification attempted without RAZORPAY_KEY_SECRET');
        return false;
      }
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(body.toString())
        .digest('hex');

      const isValid = expectedSignature === signature;
      if (!isValid) {
        logger.warn({ orderId, paymentId }, 'Razorpay signature verification failed');
      }
      return isValid;
    } catch (error) {
      logger.error({ err: error, orderId, paymentId }, 'Error verifying Razorpay signature');
      return false;
    }
  }
}

export const razorpayService = new RazorpayService();
