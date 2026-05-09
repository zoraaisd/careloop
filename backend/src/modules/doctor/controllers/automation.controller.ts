import { Request, Response } from 'express';
import { AutomationService } from '../services/automation.service';

export class AutomationController {
  static async sendBookingInvite(req: Request, res: Response) {
    try {
      const { patientId, doctorId, message } = req.body;
      if (!patientId || !doctorId) {
        return res.status(400).json({ error: 'patientId and doctorId are required' });
      }

      const result = await AutomationService.sendBookingInvite(patientId, doctorId, message);
      res.json(result);
    } catch (error: any) {
      console.error('[Automation] Booking Invite Error:', error);
      res.status(500).json({ error: error.message || 'Failed to send booking invite' });
    }
  }

  static async sendPrescriptionEnquiry(req: Request, res: Response) {
    try {
      const { patientId, doctorId, message } = req.body;
      if (!patientId || !doctorId) {
        return res.status(400).json({ error: 'patientId and doctorId are required' });
      }

      const result = await AutomationService.sendPrescriptionEnquiry(patientId, doctorId, message);
      res.json(result);
    } catch (error: any) {
      console.error('[Automation] Prescription Enquiry Error:', error);
      res.status(500).json({ error: error.message || 'Failed to send prescription enquiry' });
    }
  }

  static async sendFollowUp(req: Request, res: Response) {
    try {
      const { patientId, doctorId, message } = req.body;
      if (!patientId || !doctorId) {
        return res.status(400).json({ error: 'patientId and doctorId are required' });
      }

      const result = await AutomationService.sendFollowUpCheck(patientId, doctorId, message);
      res.json(result);
    } catch (error: any) {
      console.error('[Automation] Follow Up Error:', error);
      res.status(500).json({ error: error.message || 'Failed to send follow up' });
    }
  }

  static async sendCustomMessage(req: Request, res: Response) {
    try {
      const { patientId, doctorId, message } = req.body;
      if (!patientId || !doctorId || !message) {
        return res.status(400).json({ error: 'patientId, doctorId, and message are required' });
      }

      const result = await AutomationService.sendCustomMessage(patientId, doctorId, message);
      res.json(result);
    } catch (error: any) {
      console.error('[Automation] Custom Message Error:', error);
      res.status(500).json({ error: error.message || 'Failed to send custom message' });
    }
  }
}
