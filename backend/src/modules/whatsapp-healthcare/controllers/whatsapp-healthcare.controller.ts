import { Request, Response } from 'express';
import { WhatsappHealthcareService } from '../services/whatsapp-healthcare.service';
import { sendWhatsApp } from '../bot/whatsapp-integration';

let healthcareService: WhatsappHealthcareService;

export function setHealthcareService(service: WhatsappHealthcareService) {
  healthcareService = service;
}

export class WhatsappHealthcareController {
  // --- Dashboard ---
  static async getStats(req: Request, res: Response) {
    res.json(healthcareService.getStats());
  }

  // --- Doctors ---
  static async getDoctors(req: Request, res: Response) {
    res.json(healthcareService.getDb().doctors);
  }

  // --- Patients ---
  static async getPatients(req: Request, res: Response) {
    res.json(healthcareService.getPatients());
  }

  static async createPatient(req: Request, res: Response) {
    const patient = await healthcareService.createPatient(req.body);
    res.json({ success: true, patient });
  }

  static async updatePatient(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const idx = db.patients.findIndex((p: any) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    db.patients[idx] = { ...db.patients[idx], ...req.body };
    res.json({ success: true, patient: db.patients[idx] });
  }

  static async deletePatient(req: Request, res: Response) {
    const db = healthcareService.getDb();
    db.patients = db.patients.filter((p: any) => p.id !== req.params.id);
    res.json({ success: true });
  }

  static async getPatientDashboard(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const patient = db.patients.find((p: any) => p.id === req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const appointments = db.appointments.filter((a: any) => a.patientId === req.params.id);
    const prescriptions = db.prescriptions.filter((r: any) => r.patientId === req.params.id);
    const chats = db.chats.filter((c: any) => c.patientId === req.params.id).slice(-10);
    res.json({ success: true, data: { patient, appointments, prescriptions, chats } });
  }

  // --- Appointments ---
  static async getAppointments(req: Request, res: Response) {
    res.json(healthcareService.getAppointments());
  }

  static async createAppointment(req: Request, res: Response) {
    const appt = await healthcareService.createAppointment(req.body);
    const patient = healthcareService.getDb().patients.find((p: any) => p.id === appt.patientId);
    if (patient) {
      const msg = `✅ *Appointment Confirmed*\n\nHello ${patient.name},\nYour appointment with Dr. ${appt.doctorName} is scheduled for:\n📅 ${appt.slotDay} at ${appt.slotTime}\n\nNotes: ${appt.notes || 'N/A'}\n\nReply *CANCEL* if you cannot make it.`;
      await sendWhatsApp(patient.phone, msg);
      healthcareService.logMessage(patient.phone, 'outbound', msg, 'appointment', patient.id);
    }
    res.json({ success: true, appointment: appt });
  }

  static async updateAppointment(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const idx = db.appointments.findIndex((a: any) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    db.appointments[idx] = { ...db.appointments[idx], ...req.body };
    res.json({ success: true, appointment: db.appointments[idx] });
  }

  // --- Inventory & Expenses ---
  static async getInventory(req: Request, res: Response) {
    res.json(healthcareService.getInventory());
  }

  static async createInventoryItem(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const item = { id: 'INV' + Date.now(), ...req.body, updatedAt: new Date().toISOString() };
    db.inventory.push(item);
    res.json(item);
  }

  static async getExpenses(req: Request, res: Response) {
    res.json(healthcareService.getDb().expenses);
  }

  static async createExpense(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const exp = { id: 'EXP' + Date.now(), ...req.body, createdAt: new Date().toISOString() };
    db.expenses.push(exp);
    res.json(exp);
  }

  // --- Prescriptions ---
  static async getPrescriptions(req: Request, res: Response) {
    res.json(healthcareService.getDb().prescriptions);
  }

  static async createPrescription(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const rx = { id: 'RX' + Date.now(), ...req.body, createdAt: new Date().toISOString() };
    db.prescriptions.push(rx);
    const patient = db.patients.find((p: any) => p.id === rx.patientId);
    if (patient) {
      const medLines = (rx.medicines || []).map((m: any) => `💊 *${m.name}* — ${m.dosage} (${m.timing || 'As directed'})`).join('\n');
      const msg = `💊 *New Prescription from Dr. ${rx.doctorName || 'Your Doctor'}*\n\n🔬 Diagnosis: ${rx.diagnosis || 'General'}\n\n${medLines}\n\nReply *MEDICINES* to view anytime.`;
      await sendWhatsApp(patient.phone, msg);
      healthcareService.logMessage(patient.phone, 'outbound', msg, 'prescription', patient.id);
    }
    res.json({ success: true, prescription: rx });
  }

  // --- Chat ---
  static async getChat(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const grouped: any = {};
    db.chats.forEach((c: any) => {
      if (!grouped[c.patientId]) {
        const patient = db.patients.find((p: any) => p.id === c.patientId);
        grouped[c.patientId] = { patientId: c.patientId, patientName: patient?.name || 'Unknown', phone: patient?.phone || '', messages: [], unread: 0, lastMessage: null };
      }
      grouped[c.patientId].messages.push(c);
      if (!c.read && c.direction === 'patient') grouped[c.patientId].unread++;
      grouped[c.patientId].lastMessage = c;
    });
    res.json(Object.values(grouped).sort((a: any, b: any) => new Date(b.lastMessage?.timestamp || 0).getTime() - new Date(a.lastMessage?.timestamp || 0).getTime()));
  }

  static async getChatMessages(req: Request, res: Response) {
    const db = healthcareService.getDb();
    const chats = db.chats.filter((c: any) => c.patientId === req.params.id);
    db.chats.forEach((c: any) => { if (c.patientId === req.params.id && c.direction === 'patient') c.read = true; });
    res.json(chats);
  }

  static async markChatRead(req: Request, res: Response) {
    const db = healthcareService.getDb();
    db.chats.forEach((c: any) => { if (c.patientId === req.params.id && c.direction === 'patient') c.read = true; });
    res.json({ success: true });
  }

  static async sendChatMessage(req: Request, res: Response) {
    const { patientId, doctorId, message } = req.body;
    const db = healthcareService.getDb();
    const patient = db.patients.find((p: any) => p.id === patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const doctor = db.doctors.find((d: any) => d.id === doctorId) || { name: 'Your Doctor' };
    const whatsappMsg = `💬 *Message from ${doctor.name}:*\n\n${message}\n\n_Reply to send a message back._`;
    await sendWhatsApp(patient.phone, whatsappMsg);
    healthcareService.logMessage(patient.phone, 'outbound', whatsappMsg, 'chat', patient.id);
    healthcareService.logChat(patient.id, doctorId, 'doctor', message, 'chat');
    res.json({ success: true });
  }

  // --- Automation ---
  static async sendAutomation(req: Request, res: Response) {
    const { type, doctorId, doctorName, message } = req.body;
    const db = healthcareService.getDb();
    const patient = db.patients.find((p: any) => p.id === req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    let whatsappMsg = '';
    if (type === 'follow_up') {
      whatsappMsg = `📞 *Follow-Up Check: Dr. ${doctorName}*\n\n${message || 'Hi, how are you feeling today?'}\n\nReply GOOD / SAME / WORSE or type a message.`;
    } else if (type === 'booking_invite') {
      whatsappMsg = `📅 *Appointment Invitation*\n\nDr. ${doctorName} would like to see you for a follow-up.\n\nReply *BOOK* to see available slots.`;
    } else {
      whatsappMsg = message;
    }

    await sendWhatsApp(patient.phone, whatsappMsg);
    healthcareService.logMessage(patient.phone, 'outbound', whatsappMsg, type, patient.id);
    res.json({ success: true, preview: whatsappMsg });
  }

  // --- OTP & Verification ---
  static async sendOTP(req: Request, res: Response) {
    const { patientId } = req.body;
    const db = healthcareService.getDb();
    const patient = db.patients.find((p: any) => p.id === patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    db.pendingVerifications[patient.phone] = { otp, patientId, expires: Date.now() + 10 * 60 * 1000 };
    const msg = `🔐 *Verification Code*\n\nHello ${patient.name}, your code for HealthBot is: *${otp}*\n\nValid for 10 minutes.`;
    await sendWhatsApp(patient.phone, msg);
    res.json({ success: true });
  }

  // --- Slots ---
  static async getSlots(req: Request, res: Response) {
    res.json(healthcareService.getDb().availableSlots);
  }

  static async sendSlotsToPatient(req: Request, res: Response) {
    const { doctorId, doctorName, message } = req.body;
    const db = healthcareService.getDb();
    const patient = db.patients.find((p: any) => p.id === req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const freeSlots = db.availableSlots.filter((s: any) => !s.booked).slice(0, 8);
    const slotList = freeSlots.map((s: any, i: number) => `${i + 1}. ${s.day} ${s.time}`).join('\n');
    const msg = `📅 *Available Slots: Dr. ${doctorName}*\n\n${message || 'Please choose a slot for your appointment:'}\n\n${slotList}\n\nReply with the number to book.`;
    
    db.pendingActions[patient.phone] = { action: 'book', slots: freeSlots, doctorId, doctorName, expires: Date.now() + 60 * 60 * 1000 };
    await sendWhatsApp(patient.phone, msg);
    res.json({ success: true, slots: freeSlots });
  }

  // --- Webhook ---
  static async whatsappWebhook(req: Request, res: Response) {
    // Handle incoming messages...
    console.log('[WhatsApp Webhook] Received:', JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
  }
}
