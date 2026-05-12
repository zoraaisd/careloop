import { Request, Response } from 'express';
import { translate } from '@vitalets/google-translate-api';

import { logger } from '../../../common/logger';
import { AppDataSource } from '../../../config/data-source';
import { Patient, PatientVerificationStatus } from '../../../entities/patient.entity';
import { SupportTicket } from '../../../entities/support-ticket.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { sendWhatsApp } from '../bot/whatsapp-integration';
import { WhatsappHealthcareService } from '../services/whatsapp-healthcare.service';
import { FileStorageService } from '../../files/services/file-storage.service';

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
  private static get patientRepository() {
    return AppDataSource.getRepository(Patient);
  }
  private static get supportTicketRepository() {
    return AppDataSource.getRepository(SupportTicket);
  }
  private static get fileStorageService() {
    return new FileStorageService();
  }

  private static toConditionText(rawCondition: unknown, rawConditions: unknown): string | null {
    if (typeof rawCondition === 'string' && rawCondition.trim()) {
      return rawCondition.trim();
    }
    if (Array.isArray(rawConditions)) {
      const joined = rawConditions
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .join(', ');
      return joined || null;
    }
    if (typeof rawConditions === 'string' && rawConditions.trim()) {
      return rawConditions.trim();
    }
    return null;
  }

  private static async syncPatientToSql(req: Request, createdPatient: any): Promise<void> {
    try {
      const assignedDoctorId = String(req.body?.primaryDoctorId || (req as any).user?.userId || '').trim() || null;
      const phone = String(createdPatient?.phone || req.body?.phone || '').trim();
      if (!phone) return;

      const ageValue = Number(req.body?.age);
      const nextAge = Number.isFinite(ageValue) ? Math.max(0, Math.trunc(ageValue)) : 0;
      const condition = WhatsappHealthcareController.toConditionText(req.body?.condition, req.body?.conditions);

      const existing = await WhatsappHealthcareController.patientRepository.findOne({
        where: { phone },
      });

      if (existing) {
        existing.name = String(req.body?.name || existing.name || '').trim() || existing.name;
        existing.age = nextAge;
        existing.email = req.body?.email ? String(req.body.email).trim().toLowerCase() : null;
        existing.bloodGroup = req.body?.bloodGroup ? String(req.body.bloodGroup).trim() : null;
        existing.notes = req.body?.notes ? String(req.body.notes).trim() : null;
        existing.condition = condition;
        existing.primaryDoctorId = assignedDoctorId;
        existing.isActive = true;
        await WhatsappHealthcareController.patientRepository.save(existing);
        return;
      }

      const sqlPatient = WhatsappHealthcareController.patientRepository.create({
        name: String(req.body?.name || createdPatient?.name || '').trim() || 'Patient',
        phone,
        age: nextAge,
        email: req.body?.email ? String(req.body.email).trim().toLowerCase() : null,
        bloodGroup: req.body?.bloodGroup ? String(req.body.bloodGroup).trim() : null,
        notes: req.body?.notes ? String(req.body.notes).trim() : null,
        condition,
        primaryDoctorId: assignedDoctorId,
        verificationStatus: PatientVerificationStatus.PENDING,
        whatsappVerified: Boolean(createdPatient?.whatsappVerified ?? false),
        isActive: true,
      });

      await WhatsappHealthcareController.patientRepository.save(sqlPatient);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to sync WhatsApp patient to SQL patient table');
    }
  }

  private static async getServiceForRequest(req: Request): Promise<WhatsappHealthcareService> {
    const user = (req as any).user;
    if (!user || !user.userId) {
      throw new Error('Unauthorized: Doctor ID missing in request');
    }
    return new WhatsappHealthcareService(user.userId).init();
  }

  static async getStats(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      res.json(service.getStats());
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const limit = Number(req.query.limit);
      const messages = [...service.getDb().messages].sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      if (Number.isFinite(limit) && limit > 0) {
        res.json(messages.slice(0, limit));
        return;
      }

      res.json(messages);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getDoctors(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      res.json(service.getDb().doctors);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getPatients(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      res.json(service.getPatients());
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getSubscriptionPlans(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      res.json({
        plans: service.getSubscriptionPlans(),
        currentSubscription: service.getActiveSubscription(),
      });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async createSubscriptionCheckout(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const user = (req as any).user;
      const result = await service.createSubscriptionCheckout({
        planId: String(req.body?.planId || ''),
        doctorId: user?.userId ?? null,
        doctorName: user?.name || req.body?.doctorName,
        doctorEmail: user?.email || req.body?.doctorEmail,
        doctorPhone: user?.phone || req.body?.doctorPhone,
      });
      res.json(result);
    } catch (error: any) {
      res
        .status(400)
        .json({ error: error?.message || 'Unable to start checkout' });
    }
  }

  static async verifySubscriptionCheckout(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const subscription = await service.verifySubscriptionCheckout({
        planId: String(req.body?.planId || ''),
        orderId: req.body?.orderId,
        paymentId: req.body?.paymentId,
        signature: req.body?.signature,
      });

      try {
        const user = (req as any).user;
        const doctorProfileRepo = AppDataSource.getRepository(DoctorProfile);
        const profile = await doctorProfileRepo.findOne({ where: { userId: user.userId } });

        const { adminBillingService } = require('../../admin/services/admin-billing.service');
        await adminBillingService.recordSubscription({
          id: subscription.id,
          clinicId: user.userId,
          clinicName: profile?.clinicName ?? 'Unknown Clinic',
          planId: subscription.planId,
          planName: subscription.planName,
          status: subscription.status,
          startDate: subscription.startDate.split('T')[0],
          endDate: subscription.endDate.split('T')[0],
          amount: subscription.amount,
          currency: subscription.currency,
        });
      } catch (e) {
        logger.error({ err: e }, 'Failed to record subscription in admin billing service');
      }

      res.json({
        success: true,
        message: 'Subscription activated successfully',
        subscription,
      });
    } catch (error: any) {
      res
        .status(400)
        .json({ error: error?.message || 'Unable to verify payment' });
    }
  }

  static async createPatient(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const patient = await service.createPatient(req.body);
      await WhatsappHealthcareController.syncPatientToSql(req, patient);
      res.json({ success: true, patient });
    } catch (error: any) {
      res.status(409).json({ error: error?.message || 'Unable to create patient' });
    }
  }

  static async updatePatient(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const patient = service.updatePatient(String(req.params.id), req.body);
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
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
      db.patients = db.patients.filter((p: any) => p.id !== req.params.id);
      service.saveDb();
      res.json({ success: true });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getPatientDocuments(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const docs = service.getPatientDocuments(req.params.id as string);
      res.json(docs);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async addPatientDocument(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const { name, type, url, base64 } = req.body;
      let finalUrl = url;
      let fileId: string | null = null;

      if (type === 'file' && base64) {
        const storedFile = await WhatsappHealthcareController.fileStorageService.saveDataUrl({
          fileName: String(name || 'document').trim() || 'document',
          dataUrl: String(base64),
        });
        fileId = storedFile.id;
        finalUrl = WhatsappHealthcareController.fileStorageService.buildFileUrl(storedFile.id);
      }

      const doc = service.addPatientDocument(req.params.id as string, {
        name,
        type,
        url: finalUrl,
        fileId,
      });
      res.json({ success: true, document: doc });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static async deletePatientDocument(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const docs = service.getPatientDocuments(req.params.id as string);
      const doc = docs.find((item: any) => item.id === req.params.docId);
      if (doc?.fileId) {
        await WhatsappHealthcareController.fileStorageService.deleteFile(String(doc.fileId));
      }
      const success = service.deletePatientDocument(req.params.id as string, req.params.docId as string);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Document not found' });
      }
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static async sharePatientDocument(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const docs = service.getPatientDocuments(req.params.id as string);
      const doc = docs.find((d: any) => d.id === req.params.docId);
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const db = service.getDb();
      const patient = db.patients.find((p: any) => p.id === req.params.id);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      const isLocal = doc.url.startsWith('/');
      const host = req.get('host');
      const protocol = req.protocol;
      const absoluteUrl = isLocal ? `${protocol}://${host}${doc.url}` : doc.url;

      const message = `Here is your document from the clinic:\n*${doc.name}*\n\nView it here: ${absoluteUrl}`;
      await sendWhatsApp(patient.phone, message);
      service.logMessage(patient.phone, 'outbound', message, 'document', patient.id);

      res.json({ success: true, message: 'Document shared via WhatsApp' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static async getPatientDashboard(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
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
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getAppointments(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      res.json(service.getAppointments());
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async createAppointment(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const appt = await service.createAppointment(req.body);
      const patient = service
        .getDb()
        .patients.find((p: any) => p.id === appt.patientId);
      let notification = {
        success: true,
        message: 'Appointment confirmation sent successfully.',
      };
      if (patient) {
        const msg = `Appointment Confirmed\n\nHello ${patient.name},\nYour appointment with Dr. ${appt.doctorName} is scheduled for:\n${appt.day} at ${appt.appointmentTime}\n\nNotes: ${appt.notes || 'N/A'}\n\nReply CANCEL if you cannot make it.`;
        try {
          await sendWhatsApp(patient.phone, msg);
          service.logMessage(
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
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static async updateAppointment(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
      const idx = db.appointments.findIndex((a: any) => a.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      db.appointments[idx] = { ...db.appointments[idx], ...req.body };
      service.saveDb();
      res.json({ success: true, appointment: db.appointments[idx] });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getInventory(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      res.json(service.getInventory());
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async createInventoryItem(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
      const item = {
        id: 'INV' + Date.now(),
        ...req.body,
        updatedAt: new Date().toISOString(),
      };
      db.inventory.push(item);
      service.saveDb();
      res.json(item);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async deleteInventoryItem(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
      db.inventory = db.inventory.filter((item: any) => item.id !== req.params.id);
      service.saveDb();
      res.json({ success: true });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getExpenses(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      res.json(service.getDb().expenses);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async createExpense(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
      const exp = {
        id: 'EXP' + Date.now(),
        ...req.body,
        createdAt: new Date().toISOString(),
      };
      db.expenses.push(exp);
      service.saveDb();
      res.json(exp);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async deleteExpense(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
      db.expenses = db.expenses.filter(
        (expense: any) => expense.id !== req.params.id,
      );
      service.saveDb();
      res.json({ success: true });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getPrescriptions(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      res.json(service.getDb().prescriptions);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async createPrescription(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
      const rx = {
        id: 'RX' + Date.now(),
        ...req.body,
        createdAt: new Date().toISOString(),
      };
      db.prescriptions.push(rx);
      service.saveDb();

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
          service.logMessage(
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
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async resendPrescription(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
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
        service.logMessage(
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
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getChat(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
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
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async getChatMessages(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
      const chats = db.chats.filter((c: any) => c.patientId === req.params.id);
      db.chats.forEach((c: any) => {
        if (c.patientId === req.params.id && c.direction === 'patient') {
          c.read = true;
        }
      });
      res.json(chats);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async markChatRead(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const db = service.getDb();
      db.chats.forEach((c: any) => {
        if (c.patientId === req.params.id && c.direction === 'patient') {
          c.read = true;
        }
      });
      service.saveDb();
      res.json({ success: true });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async sendChatMessage(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const { patientId, doctorId, message, sourceLanguage, targetLanguage } =
        req.body;
      const db = service.getDb();
      let patient = db.patients.find((p: any) => p.id === patientId);

      // Fallback: Check SQL database if not found in JSON storage
      if (!patient) {
        const sqlPatient = await WhatsappHealthcareController.patientRepository.findOne({
          where: { id: patientId },
        });
        if (sqlPatient) {
          // Temporarily use SQL patient data
          patient = {
            id: sqlPatient.id,
            name: sqlPatient.name,
            phone: sqlPatient.phone,
          };
        }
      }

      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      const user = (req as any).user;
      const doctor =
        db.doctors.find((d: any) => d.id === doctorId) || {
          name: user?.name || 'Your Doctor',
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
        service.logMessage(
          patient.phone,
          'outbound',
          whatsappMsg,
          'chat',
          patient.id,
        );
        service.logChat(
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
        service.logChat(
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
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async sendAutomation(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const {
        type,
        doctorId,
        doctorName,
        message,
        sourceLanguage,
        targetLanguage,
      } = req.body;
      const db = service.getDb();
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
      service.logMessage(
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
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async sendOTP(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const { patientId } = req.body;
      const db = service.getDb();
      const patient = db.patients.find((p: any) => p.id === patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      db.pendingVerifications[patient.phone] = {
        otp,
        patientId,
        expires: Date.now() + 2 * 60 * 1000,
      };
      service.saveDb();
      const msg = `Verification Code\n\nHello ${patient.name}, your 4-digit CareLoop verification code is: ${otp}\n\nValid for 2 minutes.`;
      await sendWhatsApp(patient.phone, msg);
      res.json({ success: true, expiresInMinutes: 2 });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async confirmOTP(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const patient = service.verifyPatientOtp(
        String(req.body?.patientId || ''),
        String(req.body?.otp || ''),
      );
      res.json({ success: true, patient });
    } catch (error: any) {
      const message = error?.message || 'Unable to verify OTP';
      const status = message === 'Patient not found' ? 404 : 400;
      res.status(status).json({ error: message });
    }
  }

  static async getSlots(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      res.json(service.getDb().availableSlots);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async sendSlotsToPatient(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const { doctorId, doctorName, message } = req.body;
      const db = service.getDb();
      const patient = db.patients.find((p: any) => p.id === req.params.id);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      const freeSlots = db.availableSlots
        .filter((s: any) => !s.booked && String(s.doctorId) === String(doctorId));
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
      service.saveDb();
      await sendWhatsApp(patient.phone, msg);
      service.logMessage(patient.phone, 'outbound', msg, 'slot_picker', patient.id);
      service.logChat(patient.id, doctorId, 'doctor', msg, 'slot_picker');
      res.json({ success: true, slots: freeSlots });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static async createSupportTicket(req: Request, res: Response) {
    try {
      const service = await WhatsappHealthcareController.getServiceForRequest(req);
      const ticket = await service.createSupportTicket(req.body);
      res.json({ success: true, ticket });
    } catch (e: any) {
      logger.error({ err: e }, 'Unable to create support ticket');
      res.status(400).json({ error: e?.message || 'Unable to create support ticket' });
    }
  }

  static async getSupportTickets(req: Request, res: Response) {
    try {
      const doctorId = (req as any).user?.userId;
      if (!doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tickets = await WhatsappHealthcareController.supportTicketRepository
        .createQueryBuilder('ticket')
        .select([
          'ticket.id AS id',
          'ticket.doctorId AS "doctorId"',
          'ticket.clinicName AS "clinicName"',
          'ticket.issueTitle AS "issueTitle"',
          'ticket.description AS description',
          'ticket.status AS status',
          'ticket.priority AS priority',
          'ticket.createdAt AS "createdAt"',
        ])
        .where('ticket.doctorId = :doctorId', { doctorId })
        .orderBy('ticket.createdAt', 'DESC')
        .getRawMany();
      res.json(tickets);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static async whatsappWebhook(req: Request, res: Response) {
    console.log(
      '[WhatsApp Webhook] Received:',
      JSON.stringify(req.body, null, 2),
    );
    res.sendStatus(200);
  }
}
