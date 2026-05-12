import { v4 as uuidv4 } from 'uuid';
import { sendWhatsApp } from '../bot/whatsapp-integration';
import crypto from 'node:crypto';

import { logger } from '../../../common/logger';
import { AppDataSource } from '../../../config/data-source';
import { DoctorDashboardState } from '../../../entities/doctor-dashboard-state.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { SupportTicket, SupportTicketPriority } from '../../../entities/support-ticket.entity';
import { env } from '../../../config/env';
import { adminBillingService } from '../../admin/services/admin-billing.service';

type SubscriptionPlanSummary = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: string;
  doctorsLimit: number;
  patientsLimit: number;
  whatsappLimit: number;
  status: string;
  features: string[];
};

type CheckoutRecord = {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  createdAt: string;
  doctorId: string | null;
  doctorName: string;
  doctorEmail: string;
  doctorPhone: string;
  orderId?: string;
  paymentId?: string;
  signature?: string;
  status: 'created' | 'paid' | 'failed';
};

type ActiveSubscription = {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'Active';
  startDate: string;
  endDate: string;
  paidOn: string;
  paymentId: string;
};

export class WhatsappHealthcareService {
  private db: any;
  private readonly doctorId: string;
  private get dashboardStateRepository() {
    return AppDataSource.getRepository(DoctorDashboardState);
  }
  private isLoaded = false;

  constructor(doctorId: string) {
    this.doctorId = doctorId;
    this.db = this.createDefaultDb();
  }

  private createDefaultDb() {
    return {
      patients: [],
      appointments: [],
      prescriptions: [],
      messages: [],
      chats: [],
      pendingVerifications: {},
      pendingActions: {},
      doctors: [], // Start with empty doctors list, will be populated on sync
      inventory: [], // Start with empty inventory
      expenses: [],  // Start with empty expenses
      availableSlots: [], // Will be generated on sync
      healthTipsLogs: [],
      subscriptionCheckouts: [],
      activeSubscription: null,
      patientDocuments: {}
    };
  }

  async init(): Promise<this> {
    if (this.isLoaded) {
      return this;
    }

    let state = await this.dashboardStateRepository.findOne({
      where: { doctorId: this.doctorId },
    });

    if (!state) {
      state = this.dashboardStateRepository.create({
        doctorId: this.doctorId,
        stateJson: this.createDefaultDb(),
        migratedFromFile: false,
      });
      state = await this.dashboardStateRepository.save(state);
    }

    this.db = {
      ...this.createDefaultDb(),
      ...(state.stateJson || {}),
    };
    this.isLoaded = true;
    return this;
  }

  saveDb() {
    this.db.patients = this.normalizePatients(Array.isArray(this.db.patients) ? this.db.patients : []);
    this.syncAvailableSlots();
    void this.persistDb();
  }

  private async persistDb(): Promise<void> {
    try {
      await this.init();
      await this.dashboardStateRepository.upsert({
        doctorId: this.doctorId,
        stateJson: this.db,
        migratedFromFile: false,
      }, ['doctorId']);
    } catch (error) {
      logger.error({ err: error, doctorId: this.doctorId }, 'Failed to persist doctor dashboard state');
    }
  }

  private getDefaultDoctors() {
    // If no doctors are synced yet, we don't return dummy doctors anymore
    return this.db.doctors || [];
  }

  private generateDefaultSlots(doctors = this.getDefaultDoctors()) {
    const slots: any[] = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
    
    if (!doctors.length) return [];

    doctors.forEach((doctor: any) => {
      days.forEach(day => times.forEach(time => slots.push({
        id: `${doctor.id}_${day}_${time}`.replace(/[\s:]/g, '_'),
        day,
        time,
        booked: false,
        doctorId: doctor.id,
      })));
    });
    return slots;
  }

  private normalizeAvailableSlots(doctors: any[], slots: any[], appointments: any[]) {
    const baseSlots = this.generateDefaultSlots(doctors);
    const slotMap = new Map<string, any>();

    baseSlots.forEach((slot: any) => {
      slotMap.set(`${slot.doctorId}__${slot.day}__${slot.time}`, { ...slot });
    });

    slots.forEach((slot: any) => {
      const doctorId = slot.doctorId || (doctors[0]?.id) || 'unknown';
      const key = `${doctorId}__${slot.day}__${slot.time}`;
      const existing = slotMap.get(key) || {
        id: `${doctorId}_${slot.day}_${slot.time}`.replace(/[\s:]/g, '_'),
        doctorId,
        day: slot.day,
        time: slot.time,
        booked: false,
      };
      slotMap.set(key, {
        ...existing,
        ...slot,
        doctorId,
      });
    });

    slotMap.forEach((slot: any) => {
      slot.booked = false;
    });

    appointments
      .filter((appointment: any) => appointment.status !== 'cancelled')
      .forEach((appointment: any) => {
        const doctorId = appointment.doctorId || (doctors[0]?.id) || 'unknown';
        const key = `${doctorId}__${appointment.day}__${appointment.appointmentTime}`;
        const slot = slotMap.get(key);
        if (slot) {
          slot.booked = true;
        }
      });

    return Array.from(slotMap.values());
  }

  private syncAvailableSlots() {
    const doctors = Array.isArray(this.db.doctors) ? this.db.doctors : [];
    const slots = Array.isArray(this.db.availableSlots) ? this.db.availableSlots : [];
    const appointments = Array.isArray(this.db.appointments) ? this.db.appointments : [];
    this.db.availableSlots = this.normalizeAvailableSlots(doctors, slots, appointments);
  }

  private normalizePhone(phone: string) {
    return String(phone || '').replace(/\D/g, '');
  }

  private formatIndianPhone(phone: string) {
    const digits = this.normalizePhone(phone);
    if (!digits) {
      return '';
    }

    if (digits.length === 10) {
      return `+91${digits}`;
    }

    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }

    if (String(phone || '').trim().startsWith('+')) {
      return `+${digits}`;
    }

    return `+${digits}`;
  }

  private getNextPatientCode(patients = this.db?.patients || []) {
    const maxCode = patients.reduce((max: number, patient: any) => {
      const match = String(patient.patientCode || '').match(/^PAD(\d+)$/i);
      const value = match ? Number(match[1]) : 0;
      return Math.max(max, value);
    }, 0);
    return `PAD${String(maxCode + 1).padStart(3, '0')}`;
  }

  private normalizePatients(patients: any[]) {
    let nextCode = 1;
    return patients.map((patient: any) => {
      const existingMatch = String(patient.patientCode || '').match(/^PAD(\d+)$/i);
      const codeNumber = existingMatch ? Number(existingMatch[1]) : nextCode++;
      if (existingMatch) nextCode = Math.max(nextCode, codeNumber + 1);
      return {
        ...patient,
        phone: this.formatIndianPhone(String(patient.phone || '').trim()),
        patientCode: `PAD${String(codeNumber).padStart(3, '0')}`,
      };
    });
  }

  // --- Helpers ---
  logMessage(to: string, direction: string, message: string, type = 'text', patientId: string | null = null) {
    const entry = { id: uuidv4(), to, direction, message: message.substring(0, 500), type, patientId, timestamp: new Date().toISOString() };
    this.db.messages.push(entry);
    this.saveDb();
    return entry;
  }

  logChat(patientId: string, doctorId: string, direction: string, text: string, type = 'text') {
    const entry = { id: uuidv4(), patientId, doctorId, direction, text, type, read: direction === 'doctor', timestamp: new Date().toISOString() };
    this.db.chats.push(entry);
    this.saveDb();
    return entry;
  }

  getPatientByPhone(phone: string) {
    const clean = this.normalizePhone(phone);
    return this.db.patients.find((p: any) => this.normalizePhone(p.phone) === clean);
  }

  async notifyPatient(patientId: string, message: string, type = 'text') {
    const patient = this.db.patients.find((p: any) => p.id === patientId);
    if (!patient) return;
    await sendWhatsApp(patient.phone, message);
    this.logMessage(patient.phone, 'outbound', message, type, patientId);
  }

  // --- Patients ---
  getPatients() { return this.db.patients; }
  
  async createPatient(data: any) {
    const phone = this.formatIndianPhone(String(data.phone || '').trim());
    if (!phone) {
      throw new Error('Phone number is required');
    }

    if (this.getPatientByPhone(phone)) {
      throw new Error('Patient mobile number already exists');
    }

    const patient = {
      id: 'P' + Date.now(),
      ...data,
      phone,
      patientCode: this.getNextPatientCode(this.db.patients),
      verified: false,
      whatsappVerified: false,
      conditions: data.conditions || [],
      createdAt: new Date().toISOString()
    };
    this.db.patients.push(patient);
    this.saveDb();
    return patient;
  }

  updatePatient(patientId: string, updates: any) {
    const idx = this.db.patients.findIndex((p: any) => p.id === patientId);
    if (idx === -1) {
      throw new Error('Not found');
    }

    const nextPhone = typeof updates.phone === 'string'
      ? this.formatIndianPhone(String(updates.phone).trim())
      : this.db.patients[idx].phone;
    const duplicate = this.db.patients.find((p: any, index: number) => index !== idx && this.normalizePhone(p.phone) === this.normalizePhone(nextPhone));
    if (duplicate) {
      throw new Error('Patient mobile number already exists');
    }

    this.db.patients[idx] = {
      ...this.db.patients[idx],
      ...updates,
      phone: nextPhone,
      whatsappVerified: Boolean(updates.whatsappVerified ?? this.db.patients[idx].whatsappVerified),
      patientCode: this.db.patients[idx].patientCode || this.getNextPatientCode(this.db.patients),
    };
    this.saveDb();
    return this.db.patients[idx];
  }

  verifyPatientOtp(patientId: string, otp: string) {
    const patient = this.db.patients.find((item: any) => item.id === patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const verification = this.db.pendingVerifications[patient.phone];
    if (!verification || verification.patientId !== patientId) {
      throw new Error('OTP not found. Please send a new OTP.');
    }

    if (verification.expires < Date.now()) {
      delete this.db.pendingVerifications[patient.phone];
      this.saveDb();
      throw new Error('OTP expired. Please send a new OTP.');
    }

    if (String(verification.otp) !== String(otp || '').trim()) {
      throw new Error('Invalid OTP. Please try again.');
    }

    patient.verified = true;
    patient.whatsappVerified = true;
    delete this.db.pendingVerifications[patient.phone];
    this.saveDb();
    return patient;
  }

  // --- Appointments ---
  getAppointments() { return this.db.appointments; }

  syncDoctorRecord(data: {
    doctorId: string;
    name: string;
    specialty?: string | null;
    consultationFee?: number | null;
  }) {
    const doctorName = String(data.name || 'Doctor').trim() || 'Doctor';
    const doctorId = String(data.doctorId || '').trim();

    if (!doctorId) {
      return null;
    }

    const existingIndex = this.db.doctors.findIndex(
      (doctor: any) => doctor.id === doctorId || doctor.sourceUserId === doctorId,
    );
    const nextDoctor = {
      id: doctorId,
      sourceUserId: doctorId,
      name: doctorName,
      specialty: String(data.specialty || 'General Physician').trim() || 'General Physician',
      phone: '',
      available: true,
      avatar: doctorName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'DR',
      consultationFee: Number(data.consultationFee || 0) || 500,
    };

    if (existingIndex >= 0) {
      this.db.doctors[existingIndex] = {
        ...this.db.doctors[existingIndex],
        ...nextDoctor,
      };
    } else {
      this.db.doctors.push(nextDoctor);
    }

    this.saveDb();
    return nextDoctor;
  }

  syncExternalAppointment(data: {
    appointmentId: string;
    patientId: string;
    patientName: string;
    patientPhone: string;
    doctorId: string;
    doctorName: string;
    specialization?: string | null;
    consultationFee?: number | null;
    slotId?: string | null;
    slotDay: string;
    slotTime: string;
    date: string;
    notes?: string | null;
    patientAge?: number | null;
    patientGender?: string | null;
    patientEmail?: string | null;
  }) {
    this.syncDoctorRecord({
      doctorId: data.doctorId,
      name: data.doctorName,
      specialty: data.specialization,
      consultationFee: data.consultationFee,
    });

    const normalizedPhone = this.formatIndianPhone(String(data.patientPhone || '').trim());
    const patientIndex = this.db.patients.findIndex((patient: any) =>
      patient.id === data.patientId || this.normalizePhone(patient.phone) === this.normalizePhone(normalizedPhone),
    );
    const patientRecord = {
      id: data.patientId,
      name: data.patientName,
      phone: normalizedPhone,
      age: data.patientAge ?? null,
      gender: data.patientGender ?? null,
      email: data.patientEmail ?? null,
      verified: false,
      whatsappVerified: false,
      patientCode:
        patientIndex >= 0
          ? this.db.patients[patientIndex].patientCode
          : this.getNextPatientCode(this.db.patients),
      createdAt:
        patientIndex >= 0
          ? this.db.patients[patientIndex].createdAt || new Date().toISOString()
          : new Date().toISOString(),
    };

    if (patientIndex >= 0) {
      this.db.patients[patientIndex] = {
        ...this.db.patients[patientIndex],
        ...patientRecord,
      };
    } else {
      this.db.patients.push(patientRecord);
    }

    const appointmentIndex = this.db.appointments.findIndex(
      (appointment: any) => appointment.id === data.appointmentId,
    );
    const appointmentRecord = {
      id: data.appointmentId,
      patientId: data.patientId,
      patientName: data.patientName,
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      slotId: data.slotId ?? null,
      slotDay: data.slotDay,
      slotTime: data.slotTime,
      date: data.date,
      notes: data.notes ?? '',
      fee: Number(data.consultationFee || 0) || 500,
      status: 'scheduled',
      createdAt:
        appointmentIndex >= 0
          ? this.db.appointments[appointmentIndex].createdAt || new Date().toISOString()
          : new Date().toISOString(),
    };

    if (appointmentIndex >= 0) {
      this.db.appointments[appointmentIndex] = {
        ...this.db.appointments[appointmentIndex],
        ...appointmentRecord,
      };
    } else {
      this.db.appointments.push(appointmentRecord);
    }

    const slotIndex = this.db.availableSlots.findIndex(
      (slot: any) => slot.doctorId === data.doctorId && slot.day === data.slotDay && slot.time === data.slotTime,
    );
    const slotRecord = {
      id:
        data.slotId ||
        `${data.doctorId}_${data.slotDay}_${data.slotTime}`.replace(/[\s:]/g, '_'),
      doctorId: data.doctorId,
      day: data.slotDay,
      time: data.slotTime,
      date: data.date,
      booked: true,
    };

    if (slotIndex >= 0) {
      this.db.availableSlots[slotIndex] = {
        ...this.db.availableSlots[slotIndex],
        ...slotRecord,
      };
    } else {
      this.db.availableSlots.push(slotRecord);
    }

    this.saveDb();
  }
  
  async createAppointment(data: any) {
    const matchedDoctor = this.db.doctors.find((d: any) => d.id === data.doctorId);
    const appt = {
      id: 'A' + Date.now(),
      ...data,
      fee: Number(data.fee || matchedDoctor?.consultationFee || 500),
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };
    this.db.appointments.push(appt);
    const si = this.db.availableSlots.findIndex((s: any) => s.doctorId === appt.doctorId && s.day === appt.day && s.time === appt.appointmentTime);
    if (si !== -1) this.db.availableSlots[si].booked = true;
    this.saveDb();
    return appt;
  }

  // --- Inventory ---
  getInventory() { return this.db.inventory; }

  // --- Stats ---
  getStats() {
    return {
      totalPatients: this.db.patients.length,
      verifiedPatients: this.db.patients.filter((p: any) => p.verified).length,
      scheduledAppointments: this.db.appointments.filter((a: any) => a.status === 'scheduled').length,
      activePrescriptions: this.db.prescriptions.length,
      messagesSent: this.db.messages.filter((m: any) => m.direction === 'outbound').length,
      freeSlots: this.db.availableSlots.filter((s: any) => !s.booked).length,
      unreadChats: this.db.chats.filter((c: any) => !c.read && c.direction === 'patient').length
    };
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlanSummary[]> {
    const plans = await adminBillingService.getPlans();
    return plans
      .filter((plan) => plan.status === 'Active')
      .map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: 'INR',
        billingCycle: plan.billingCycle,
        doctorsLimit: plan.doctorsLimit,
        patientsLimit: plan.patientsLimit,
        whatsappLimit: plan.whatsappLimit,
        status: plan.status,
        features: [
          `${plan.doctorsLimit} doctors included`,
          `${plan.patientsLimit.toLocaleString('en-IN')} patients`,
          `${plan.whatsappLimit.toLocaleString('en-IN')} WhatsApp messages`,
          `Billed every ${plan.billingCycle}`,
        ],
      }));
  }

  getActiveSubscription(): ActiveSubscription | null {
    return this.db.activeSubscription ?? null;
  }

  private async findPlan(planId: string): Promise<SubscriptionPlanSummary> {
    const plans = await this.getSubscriptionPlans();
    const plan = plans.find((item) => item.id === planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    return plan;
  }

  private async createRazorpayOrder(amount: number, currency: string, receipt: string) {
    const auth = Buffer.from(
      `${env.razorpayKeyId}:${env.razorpayKeySecret}`,
      'utf8',
    ).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        payment_capture: 1,
      }),
    });

    const data = (await response.json()) as {
      id?: string;
      amount?: number;
      currency?: string;
      error?: { description?: string };
    };

    if (!response.ok || !data.id) {
      throw new Error(
        data.error?.description || 'Unable to create Razorpay order',
      );
    }

    return {
      id: data.id,
      amount: Number(data.amount || amount),
      currency: data.currency || currency,
    };
  }

  async createSubscriptionCheckout(payload: {
    planId: string;
    doctorId?: string | null;
    doctorName?: string;
    doctorEmail?: string;
    doctorPhone?: string;
  }) {
    const plan = await this.findPlan(payload.planId);
    const amount = Math.round(Number(plan.price) * 100);
    const checkoutId = `sub_${Date.now()}`;
    const doctorName = String(payload.doctorName || 'Doctor').trim();
    const doctorEmail = String(payload.doctorEmail || '').trim();
    const doctorPhone = String(payload.doctorPhone || '').trim();

    const record: CheckoutRecord = {
      id: checkoutId,
      planId: plan.id,
      planName: plan.name,
      amount,
      currency: plan.currency,
      createdAt: new Date().toISOString(),
      doctorId: payload.doctorId ?? null,
      doctorName,
      doctorEmail,
      doctorPhone,
      status: 'created',
    };

    if (env.razorpayKeyId && env.razorpayKeySecret) {
      const order = await this.createRazorpayOrder(
        amount,
        plan.currency,
        checkoutId,
      );
      record.orderId = order.id;
      this.db.subscriptionCheckouts.push(record);
      this.saveDb();
      return {
        provider: 'razorpay',
        planId: plan.id,
        planName: plan.name,
        keyId: env.razorpayKeyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: env.razorpayCompanyName,
        description: `${plan.name} monthly subscription`,
        prefill: {
          name: doctorName,
          email: doctorEmail,
          contact: doctorPhone,
        },
        notes: {
          planId: plan.id,
          planName: plan.name,
          checkoutId,
        },
        theme: { color: '#25d366' },
      };
    }

    this.db.subscriptionCheckouts.push(record);
    this.saveDb();

    return {
      provider: 'manual',
      planId: plan.id,
      planName: plan.name,
      amount,
      currency: plan.currency,
      message:
        'Razorpay keys are not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env to enable live checkout.',
      adminUpiId: env.subscriptionAdminUpiId || null,
      adminName: env.subscriptionAdminName,
      supportPhone: env.subscriptionSupportPhone || null,
    };
  }

  async verifySubscriptionCheckout(payload: {
    planId: string;
    orderId?: string;
    paymentId?: string;
    signature?: string;
  }) {
    const plan = await this.findPlan(payload.planId);
    const paymentId = String(payload.paymentId || '').trim();

    if (!paymentId) {
      throw new Error('Payment id is required');
    }

    if (env.razorpayKeySecret) {
      const rawSignature = `${payload.orderId || ''}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', env.razorpayKeySecret)
        .update(rawSignature)
        .digest('hex');

      if (payload.signature !== expectedSignature) {
        throw new Error('Invalid Razorpay signature');
      }
    }

    const checkout = this.db.subscriptionCheckouts.find(
      (item: CheckoutRecord) =>
        item.planId === payload.planId &&
        (!payload.orderId || item.orderId === payload.orderId),
    ) as CheckoutRecord | undefined;

    if (checkout) {
      checkout.paymentId = paymentId;
      checkout.signature = payload.signature;
      checkout.status = 'paid';
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription: ActiveSubscription = {
      id: `subscription_${Date.now()}`,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      currency: plan.currency,
      status: 'Active',
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      paidOn: now.toISOString(),
      paymentId,
    };

    this.db.activeSubscription = subscription;
    this.saveDb();

    return subscription;
  }

  // --- Support Tickets ---
  private async ensureSupportTicketTable() {
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id uuid PRIMARY KEY,
        doctor_id varchar(100) NOT NULL,
        clinic_name varchar(255) NOT NULL,
        issue_title varchar(255) NOT NULL,
        description text NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'Open',
        priority varchar(32) NOT NULL DEFAULT 'Medium',
        clinic_email varchar(255) NULL,
        clinic_phone varchar(50) NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await AppDataSource.query(`
      ALTER TABLE support_tickets
      ADD COLUMN IF NOT EXISTS clinic_email varchar(255) NULL;
    `);
    await AppDataSource.query(`
      ALTER TABLE support_tickets
      ADD COLUMN IF NOT EXISTS clinic_phone varchar(50) NULL;
    `);
  }

  async createSupportTicket(data: {
    clinicName?: string;
    doctorName?: string;
    doctorPhone?: string;
    doctorEmail?: string;
    title: string;
    description: string;
    priority?: string;
  }) {
    const ticketRepository = AppDataSource.getRepository(SupportTicket);
    const doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
    const doctor = this.db.doctors[0] || { name: 'Doctor', id: this.doctorId }; // Fallback to current ID
    const doctorProfile = await doctorProfileRepository.findOne({
      where: { userId: this.doctorId },
      select: ['clinicName'],
    });

    const normalizedDoctorName = String(data.doctorName || doctor.name || 'Doctor').trim();
    const normalizedDoctorPhone = String(data.doctorPhone || '').trim();
    const normalizedDoctorEmail = String(data.doctorEmail || '').trim();
    const normalizedDescription = String(data.description || '').trim();
    const doctorMeta = [
      `Doctor: ${normalizedDoctorName}`,
      normalizedDoctorPhone ? `Phone: ${normalizedDoctorPhone}` : '',
      normalizedDoctorEmail ? `Email: ${normalizedDoctorEmail}` : '',
    ].filter(Boolean).join('\n');
    const descriptionWithDoctor = normalizedDescription
      ? `${doctorMeta}\n${normalizedDescription}`
      : doctorMeta;

    const ticket = ticketRepository.create({
      id: uuidv4(),
      doctorId: this.doctorId,
      clinicName: String(doctorProfile?.clinicName || data.clinicName || doctor.clinicName || doctor.name || 'Unknown Clinic').trim(),
      issueTitle: data.title,
      description: descriptionWithDoctor,
      priority: (data.priority as any) || SupportTicketPriority.MEDIUM,
      status: 'Open' as any,
      clinicEmail: normalizedDoctorEmail || null,
      clinicPhone: normalizedDoctorPhone || null,
    } as any);
    try {
      return await ticketRepository.save(ticket);
    } catch (error: any) {
      const message = String(error?.message || '');
      if (/support_tickets/i.test(message) || /clinic_email|clinic_phone/i.test(message)) {
        await this.ensureSupportTicketTable();
        return await ticketRepository.save(ticket);
      }
      throw error;
    }
  }

  getPatientDocuments(patientId: string) {
    if (!this.db.patientDocuments) this.db.patientDocuments = {};
    return this.db.patientDocuments[patientId] || [];
  }

  addPatientDocument(patientId: string, document: {
    name: string;
    type: 'link' | 'file';
    url: string;
    fileId?: string | null;
  }) {
    if (!this.db.patientDocuments) this.db.patientDocuments = {};
    if (!this.db.patientDocuments[patientId]) this.db.patientDocuments[patientId] = [];
    const doc = {
      id: `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: document.name,
      type: document.type,
      url: document.url,
      fileId: document.fileId ?? null,
      createdAt: new Date().toISOString()
    };
    this.db.patientDocuments[patientId].push(doc);
    this.saveDb();
    return doc;
  }

  deletePatientDocument(patientId: string, docId: string) {
    if (!this.db.patientDocuments || !this.db.patientDocuments[patientId]) return false;
    const initialLength = this.db.patientDocuments[patientId].length;
    this.db.patientDocuments[patientId] = this.db.patientDocuments[patientId].filter((d: any) => d.id !== docId);
    if (this.db.patientDocuments[patientId].length !== initialLength) {
      this.saveDb();
      return true;
    }
    return false;
  }

  getDb() { return this.db; }

  static async listTrackedDoctorIds(): Promise<string[]> {
    const repository = AppDataSource.getRepository(DoctorDashboardState);
    const rows = await repository.find({ select: ['doctorId'] });
    return rows.map((row) => row.doctorId);
  }
}
