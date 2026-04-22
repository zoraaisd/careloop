import { Request, Response } from 'express';
import { translate } from '@vitalets/google-translate-api';

import { logger } from '../../../common/logger';
import { sendWhatsApp } from '../bot/whatsapp-integration';
import { WhatsappHealthcareService } from '../services/whatsapp-healthcare.service';

let healthcareService: WhatsappHealthcareService;

export function setHealthcareService(service: WhatsappHealthcareService) {
  healthcareService = service;
}

const SUPPORTED_TRANSLATION_LANGUAGES = new Set(['en', 'ta', 'hi']);

async function translateMessageIfNeeded(
  message: string,
  sourceLanguage?: string,
  targetLanguage?: string,
) {
  const normalizedMessage = String(message || '').trim();
  const normalizedTarget = String(targetLanguage || 'en').toLowerCase();
  const normalizedSource = String(sourceLanguage || 'en').toLowerCase();

  if (
    !normalizedMessage ||
    !SUPPORTED_TRANSLATION_LANGUAGES.has(normalizedTarget) ||
    normalizedTarget === 'en' ||
    normalizedTarget === normalizedSource
  ) {
    return {
      text: normalizedMessage,
      translated: false,
      targetLanguage: normalizedTarget,
    };
  }

  try {
    const result = await translate(normalizedMessage, {
      from: normalizedSource,
      to: normalizedTarget,
    });
    return {
      text: result.text,
      translated: result.text.trim() !== normalizedMessage,
      targetLanguage: normalizedTarget,
    };
  } catch (error) {
    logger.error(
      {
        err: error,
        sourceLanguage: normalizedSource,
        targetLanguage: normalizedTarget,
      },
      'Failed to translate outgoing WhatsApp message',
    );
    return {
      text: normalizedMessage,
      translated: false,
      targetLanguage: normalizedTarget,
    };
  }
}

export class WhatsappHealthcareController {
  static async getStats(req: Request, res: Response) {
    res.json(healthcareService.getStats());
  }

  static async getMessages(req: Request, res: Response) {
    const limit = Number(req.query.limit);
    const messages = [...healthcareService.getDb().messages].sort(
      (a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    if (Number.isFinite(limit) && limit > 0) {
      res.json(messages.slice(0, limit));
      return;
    }

    res.json(messages);
  }

  static async getDoctors(req: Request, res: Response) {
    res.json(healthcareService.getDb().doctors);
  }

  static async getPatients(req: Request, res: Response) {
    res.json(healthcareService.getPatients());
  }

  static async createPatient(req: Request, res: Response) {
    try {
      const patient = await healthcareService.createPatient(req.body);
      res.json({ success: true, patient });
    } catch (error: any) {
      res.status(409).json({ error: error?.message || 'Unable to create patient' });
    }
  }

  static async updatePatient(req: Request, res: Response) {
    try {
      const patient = healthcareService.updatePatient(String(req.params.id), req.body);
      res.json({ success: true, patient });
    } catch (error: any) {
      if (error?.message === 'Not found') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(409).json({ error: error?.message || 'Unable to update patient' });
    }
  }

  static async deletePatient(req: Request, res: Response) {
    const db = healthcareService.getDb();
    db.patients = db.patients.filter((p: any) => p.id !== req.params.id);
    healthcareService.saveDb();
    res.json({ success: true });
  }

  static async getPatientDashboard(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const patient = db.patients.find((p: any) => p.id === req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const appointments = db.appointments.filter(
      (a: any) => a.patientId === req.params.id,
    );
    const prescriptions = db.prescriptions.filter(
      (r: any) => r.patientId === req.params.id,
    );
    const chats = db.chats
      .filter((c: any) => c.patientId === req.params.id)
      .slice(-10);
    res.json({
      success: true,
      data: { patient, appointments, prescriptions, chats },
    });
  }

  static async getAppointments(req: Request, res: Response) {
    res.json(healthcareService.getAppointments());
  }

  static async createAppointment(req: Request, res: Response) {
    const appt = await healthcareService.createAppointment(req.body);
    const patient = healthcareService
      .getDb()
      .patients.find((p: any) => p.id === appt.patientId);
    let notification = {
      success: true,
      message: 'Appointment confirmation sent successfully.',
    };
    if (patient) {
      const msg = `Appointment Confirmed\n\nHello ${patient.name},\nYour appointment with Dr. ${appt.doctorName} is scheduled for:\n${appt.slotDay} at ${appt.slotTime}\n\nNotes: ${appt.notes || 'N/A'}\n\nReply CANCEL if you cannot make it.`;
      try {
        await sendWhatsApp(patient.phone, msg);
        healthcareService.logMessage(
          patient.phone,
          'outbound',
          msg,
          'appointment',
          patient.id,
        );
      } catch (error: any) {
        notification = {
          success: false,
          message:
            error?.message ||
            'Appointment saved, but WhatsApp delivery failed.',
        };
      }
    }
    res.json({ success: true, appointment: appt, notification });
  }

  static async updateAppointment(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const idx = db.appointments.findIndex((a: any) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    db.appointments[idx] = { ...db.appointments[idx], ...req.body };
    healthcareService.saveDb();
    res.json({ success: true, appointment: db.appointments[idx] });
  }

  static async getInventory(req: Request, res: Response) {
    res.json(healthcareService.getInventory());
  }

  static async createInventoryItem(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const item = {
      id: 'INV' + Date.now(),
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    db.inventory.push(item);
    healthcareService.saveDb();
    res.json(item);
  }

  static async deleteInventoryItem(req: Request, res: Response) {
    const db = healthcareService.getDb();
    db.inventory = db.inventory.filter((item: any) => item.id !== req.params.id);
    healthcareService.saveDb();
    res.json({ success: true });
  }

  static async getExpenses(req: Request, res: Response) {
    res.json(healthcareService.getDb().expenses);
  }

  static async createExpense(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const exp = {
      id: 'EXP' + Date.now(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    db.expenses.push(exp);
    healthcareService.saveDb();
    res.json(exp);
  }

  static async deleteExpense(req: Request, res: Response) {
    const db = healthcareService.getDb();
    db.expenses = db.expenses.filter(
      (expense: any) => expense.id !== req.params.id,
    );
    healthcareService.saveDb();
    res.json({ success: true });
  }

  static async getPrescriptions(req: Request, res: Response) {
    res.json(healthcareService.getDb().prescriptions);
  }

  static async createPrescription(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const rx = {
      id: 'RX' + Date.now(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    db.prescriptions.push(rx);
    healthcareService.saveDb();

    const patient = db.patients.find((p: any) => p.id === rx.patientId);
    let notification = {
      success: true,
      message: 'Prescription saved and sent successfully.',
    };

    if (patient) {
      const medLines = (rx.medicines || [])
        .map(
          (m: any) =>
            `${m.name} - ${m.dosage} (${m.timing || 'As directed'})`,
        )
        .join('\n');
      const msg = `New Prescription from Dr. ${rx.doctorName || 'Your Doctor'}\n\nDiagnosis: ${rx.diagnosis || 'General'}\n\n${medLines}\n\nReply MEDICINES to view anytime.`;

      try {
        await sendWhatsApp(patient.phone, msg);
        healthcareService.logMessage(
          patient.phone,
          'outbound',
          msg,
          'prescription',
          patient.id,
        );
      } catch (error: any) {
        notification = {
          success: false,
          message:
            error?.message ||
            'Prescription saved, but WhatsApp delivery failed.',
        };
        logger.error(
          { err: error, patientId: patient.id, prescriptionId: rx.id },
          'Failed to send prescription WhatsApp message',
        );
      }
    }

    res.json({ success: true, prescription: rx, notification });
  }

  static async resendPrescription(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const prescription = db.prescriptions.find(
      (item: any) => item.id === req.params.id,
    );
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const patient = db.patients.find(
      (item: any) => item.id === prescription.patientId,
    );
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const medLines = (prescription.medicines || [])
      .map(
        (medicine: any) =>
          `${medicine.name} - ${medicine.dosage} (${medicine.timing || 'As directed'})`,
      )
      .join('\n');
    const message = `Prescription from Dr. ${prescription.doctorName || 'Your Doctor'}\n\nDiagnosis: ${prescription.diagnosis || 'General'}\n\n${medLines}\n\nReply MEDICINES to view anytime.`;

    let notification = {
      success: true,
      message: 'Prescription resent successfully.',
    };

    try {
      await sendWhatsApp(patient.phone, message);
      healthcareService.logMessage(
        patient.phone,
        'outbound',
        message,
        'prescription',
        patient.id,
      );
    } catch (error: any) {
      notification = {
        success: false,
        message:
          error?.message || 'Prescription found, but WhatsApp resend failed.',
      };
      logger.error(
        { err: error, patientId: patient.id, prescriptionId: prescription.id },
        'Failed to resend prescription WhatsApp message',
      );
    }

    res.json({ success: true, notification });
  }

  static async getChat(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const grouped: any = {};
    db.chats.forEach((c: any) => {
      if (!grouped[c.patientId]) {
        const patient = db.patients.find((p: any) => p.id === c.patientId);
        grouped[c.patientId] = {
          patientId: c.patientId,
          patientName: patient?.name || 'Unknown',
          phone: patient?.phone || '',
          messages: [],
          unread: 0,
          lastMessage: null,
        };
      }
      grouped[c.patientId].messages.push(c);
      if (!c.read && c.direction === 'patient') grouped[c.patientId].unread++;
      grouped[c.patientId].lastMessage = c;
    });
    res.json(
      Object.values(grouped).sort(
        (a: any, b: any) =>
          new Date(b.lastMessage?.timestamp || 0).getTime() -
          new Date(a.lastMessage?.timestamp || 0).getTime(),
      ),
    );
  }

  static async getChatMessages(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const chats = db.chats.filter((c: any) => c.patientId === req.params.id);
    db.chats.forEach((c: any) => {
      if (c.patientId === req.params.id && c.direction === 'patient') {
        c.read = true;
      }
    });
    res.json(chats);
  }

  static async markChatRead(req: Request, res: Response) {
    const db = healthcareService.getDb();
    db.chats.forEach((c: any) => {
      if (c.patientId === req.params.id && c.direction === 'patient') {
        c.read = true;
      }
    });
    healthcareService.saveDb();
    res.json({ success: true });
  }

  static async sendChatMessage(req: Request, res: Response) {
    const { patientId, doctorId, message, sourceLanguage, targetLanguage } =
      req.body;
    const db = healthcareService.getDb();
    const patient = db.patients.find((p: any) => p.id === patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const doctor =
      db.doctors.find((d: any) => d.id === doctorId) || {
        name: 'Your Doctor',
      };

    const translatedMessage = await translateMessageIfNeeded(
      message,
      sourceLanguage,
      targetLanguage,
    );
    const outboundText = translatedMessage.text || message;
    const whatsappMsg = `Message from ${doctor.name}:\n\n${outboundText}\n\nReply to send a message back.`;
    let notification = {
      success: true,
      message: 'Chat message sent successfully.',
    };

    try {
      await sendWhatsApp(patient.phone, whatsappMsg);
      healthcareService.logMessage(
        patient.phone,
        'outbound',
        whatsappMsg,
        'chat',
        patient.id,
      );
      healthcareService.logChat(
        patient.id,
        doctorId,
        'doctor',
        outboundText,
        'chat',
      );
    } catch (error: any) {
      notification = {
        success: false,
        message:
          error?.message || 'Message saved, but WhatsApp delivery failed.',
      };
      healthcareService.logChat(
        patient.id,
        doctorId,
        'doctor',
        outboundText,
        'chat',
      );
      logger.error(
        { err: error, patientId: patient.id, doctorId },
        'Failed to send chat WhatsApp message',
      );
    }

    res.json({
      success: true,
      notification,
      translated: translatedMessage.translated,
      translatedText: outboundText,
      targetLanguage: translatedMessage.targetLanguage,
    });
  }

  static async sendAutomation(req: Request, res: Response) {
    const {
      type,
      doctorId,
      doctorName,
      message,
      sourceLanguage,
      targetLanguage,
    } = req.body;
    const db = healthcareService.getDb();
    const patient = db.patients.find((p: any) => p.id === req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    let baseMessage = '';
    if (type === 'follow_up') {
      baseMessage =
        message || 'Hi, how are you feeling today? Reply GOOD / SAME / WORSE.';
    } else if (type === 'booking_invite') {
      baseMessage =
        'Dr. ' +
        doctorName +
        ' would like to see you for a follow-up. Reply BOOK to see available slots.';
    } else {
      baseMessage = message;
    }

    const translatedMessage = await translateMessageIfNeeded(
      baseMessage,
      sourceLanguage,
      targetLanguage,
    );
    const whatsappMsg = translatedMessage.text || baseMessage;

    await sendWhatsApp(patient.phone, whatsappMsg);
    healthcareService.logMessage(
      patient.phone,
      'outbound',
      whatsappMsg,
      type,
      patient.id,
    );
    res.json({
      success: true,
      preview: whatsappMsg,
      translated: translatedMessage.translated,
      targetLanguage: translatedMessage.targetLanguage,
    });
  }

  static async sendOTP(req: Request, res: Response) {
    const { patientId } = req.body;
    const db = healthcareService.getDb();
    const patient = db.patients.find((p: any) => p.id === patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    db.pendingVerifications[patient.phone] = {
      otp,
      patientId,
      expires: Date.now() + 10 * 60 * 1000,
    };
    healthcareService.saveDb();
    const msg = `Verification Code\n\nHello ${patient.name}, your code for HealthBot is: ${otp}\n\nValid for 10 minutes.`;
    await sendWhatsApp(patient.phone, msg);
    res.json({ success: true });
  }

  static async getSlots(req: Request, res: Response) {
    res.json(healthcareService.getDb().availableSlots);
  }

  static async sendSlotsToPatient(req: Request, res: Response) {
    const { doctorId, doctorName, message } = req.body;
    const db = healthcareService.getDb();
    const patient = db.patients.find((p: any) => p.id === req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const freeSlots = db.availableSlots
      .filter((s: any) => !s.booked)
      .slice(0, 8);
    const slotList = freeSlots
      .map((s: any, i: number) => `${i + 1}. ${s.day} ${s.time}`)
      .join('\n');
    const msg = `Available Slots: Dr. ${doctorName}\n\n${message || 'Please choose a slot for your appointment:'}\n\n${slotList}\n\nReply with the number to book.`;

    db.pendingActions[patient.phone] = {
      action: 'book',
      slots: freeSlots,
      doctorId,
      doctorName,
      expires: Date.now() + 60 * 60 * 1000,
    };
    healthcareService.saveDb();
    await sendWhatsApp(patient.phone, msg);
    res.json({ success: true, slots: freeSlots });
  }

  static async whatsappWebhook(req: Request, res: Response) {
    console.log(
      '[WhatsApp Webhook] Received:',
      JSON.stringify(req.body, null, 2),
    );
    res.sendStatus(200);
  }
}
