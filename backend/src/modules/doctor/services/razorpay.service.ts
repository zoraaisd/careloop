import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../../../common/logger';

export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
  }

  async createOrder(amount: number, currency: string = 'INR', receipt: string) {
    try {
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
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
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
