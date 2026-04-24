import { v4 as uuidv4 } from 'uuid';
import { sendWhatsApp } from '../bot/whatsapp-integration';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';

import { env } from '../../../config/env';
import { subscriptionPlanSeed } from '../../admin/data/admin.mock-data';

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
  private readonly storagePath = path.resolve(process.cwd(), 'data', 'whatsapp-healthcare.json');
  private db: any;

  constructor() {
    this.db = this.loadDb();
    this.saveDb();
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
      doctors: this.getDefaultDoctors(),
      inventory: [
        { id: 'INV1', name: 'Surgical Gloves', category: 'Consumables', quantity: 180, unit: 'pairs', reorderLevel: 60, unitCost: 12, vendor: 'Medi Supply Co', updatedAt: new Date().toISOString() },
        { id: 'INV2', name: 'Syringes 5ml', category: 'Consumables', quantity: 95, unit: 'pcs', reorderLevel: 40, unitCost: 8, vendor: 'Health First Traders', updatedAt: new Date().toISOString() },
        { id: 'INV3', name: 'Vitamin D Tablets', category: 'Pharmacy', quantity: 42, unit: 'boxes', reorderLevel: 20, unitCost: 95, vendor: 'Care Pharma', updatedAt: new Date().toISOString() }
      ],
      expenses: [
        { id: 'EXP1', title: 'Electricity Bill', category: 'Utilities', amount: 4800, incurredOn: new Date().toISOString(), notes: 'Monthly clinic bill', createdAt: new Date().toISOString() },
        { id: 'EXP2', title: 'Cleaning Service', category: 'Maintenance', amount: 2200, incurredOn: new Date().toISOString(), notes: 'Weekly cleaning', createdAt: new Date().toISOString() }
      ],
      availableSlots: this.generateDefaultSlots(),
      healthTipsLogs: [],
      subscriptionCheckouts: [],
      activeSubscription: null
    };
  }

  private loadDb() {
    const defaultDb = this.createDefaultDb();
    if (!fs.existsSync(this.storagePath)) {
      return defaultDb;
    }

    try {
      const raw = fs.readFileSync(this.storagePath, 'utf8');
      const parsed = JSON.parse(raw);
      const doctors = Array.isArray(parsed.doctors) && parsed.doctors.length ? parsed.doctors : defaultDb.doctors;
      const appointments = Array.isArray(parsed.appointments) ? parsed.appointments : defaultDb.appointments;
      const patients = this.normalizePatients(
        Array.isArray(parsed.patients) ? parsed.patients : defaultDb.patients,
      );
      const availableSlots = this.normalizeAvailableSlots(
        doctors,
        Array.isArray(parsed.availableSlots) ? parsed.availableSlots : defaultDb.availableSlots,
        appointments,
      );
      return {
        ...defaultDb,
        ...parsed,
        doctors,
        patients,
        inventory: Array.isArray(parsed.inventory) && parsed.inventory.length ? parsed.inventory : defaultDb.inventory,
        expenses: Array.isArray(parsed.expenses) && parsed.expenses.length ? parsed.expenses : defaultDb.expenses,
        appointments,
        availableSlots,
        subscriptionCheckouts: Array.isArray(parsed.subscriptionCheckouts)
          ? parsed.subscriptionCheckouts
          : defaultDb.subscriptionCheckouts,
        activeSubscription:
          parsed.activeSubscription && typeof parsed.activeSubscription === 'object'
            ? parsed.activeSubscription
            : defaultDb.activeSubscription,
      };
    } catch {
      return defaultDb;
    }
  }

  saveDb() {
    this.db.patients = this.normalizePatients(Array.isArray(this.db.patients) ? this.db.patients : []);
    this.syncAvailableSlots();
    const storageDirectory = path.dirname(this.storagePath);
    if (!fs.existsSync(storageDirectory)) {
      fs.mkdirSync(storageDirectory, { recursive: true });
    }

    fs.writeFileSync(this.storagePath, JSON.stringify(this.db, null, 2), 'utf8');
  }

  private getDefaultDoctors() {
    return [
      { id: 'doc1', name: 'Dr. Arjun Mehta', specialty: 'General Physician', phone: '+919876543210', available: true, avatar: 'AM', consultationFee: 600 },
      { id: 'doc2', name: 'Dr. Priya Nair', specialty: 'Cardiologist', phone: '+919876543211', available: true, avatar: 'PN', consultationFee: 900 },
      { id: 'doc3', name: 'Dr. Ravi Kumar', specialty: 'Dermatologist', phone: '+919876543212', available: true, avatar: 'RK', consultationFee: 750 }
    ];
  }

  private generateDefaultSlots(doctors = this.getDefaultDoctors()) {
    const slots: any[] = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
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
      const doctorId = slot.doctorId || 'doc1';
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
        const doctorId = appointment.doctorId || 'doc1';
        const key = `${doctorId}__${appointment.slotDay}__${appointment.slotTime}`;
        const slot = slotMap.get(key);
        if (slot) {
          slot.booked = true;
        }
      });

    return Array.from(slotMap.values());
  }

  private syncAvailableSlots() {
    const doctors = Array.isArray(this.db.doctors) && this.db.doctors.length
      ? this.db.doctors
      : this.getDefaultDoctors();
    const slots = Array.isArray(this.db.availableSlots) ? this.db.availableSlots : [];
    const appointments = Array.isArray(this.db.appointments) ? this.db.appointments : [];
    this.db.availableSlots = this.normalizeAvailableSlots(doctors, slots, appointments);
  }

  private normalizePhone(phone: string) {
    return String(phone || '').replace(/\D/g, '');
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
        phone: String(patient.phone || '').trim(),
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
    const phone = String(data.phone || '').trim();
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
      conditions: data.conditions || [],
      createdAt: new Date().toISOString()
    };
    this.db.patients.push(patient);
    this.saveDb();
    // Logic for welcome and verify can go here
    return patient;
  }

  updatePatient(patientId: string, updates: any) {
    const idx = this.db.patients.findIndex((p: any) => p.id === patientId);
    if (idx === -1) {
      throw new Error('Not found');
    }

    const nextPhone = typeof updates.phone === 'string' ? String(updates.phone).trim() : this.db.patients[idx].phone;
    const duplicate = this.db.patients.find((p: any, index: number) => index !== idx && this.normalizePhone(p.phone) === this.normalizePhone(nextPhone));
    if (duplicate) {
      throw new Error('Patient mobile number already exists');
    }

    this.db.patients[idx] = {
      ...this.db.patients[idx],
      ...updates,
      phone: nextPhone,
      patientCode: this.db.patients[idx].patientCode || this.getNextPatientCode(this.db.patients),
    };
    this.saveDb();
    return this.db.patients[idx];
  }

  // --- Appointments ---
  getAppointments() { return this.db.appointments; }
  
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
    const si = this.db.availableSlots.findIndex((s: any) => s.doctorId === appt.doctorId && s.day === appt.slotDay && s.time === appt.slotTime);
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

  getSubscriptionPlans(): SubscriptionPlanSummary[] {
    return subscriptionPlanSeed
      .filter((plan) => plan.status === 'Active')
      .map((plan) => ({
        ...plan,
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

  private findPlan(planId: string): SubscriptionPlanSummary {
    const plan = this.getSubscriptionPlans().find((item) => item.id === planId);
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
    const plan = this.findPlan(payload.planId);
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
    const plan = this.findPlan(payload.planId);
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

  // Port other methods as needed...
  getDb() { return this.db; }
}
