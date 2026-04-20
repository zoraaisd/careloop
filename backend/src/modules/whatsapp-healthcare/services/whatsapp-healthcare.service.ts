import { v4 as uuidv4 } from 'uuid';
import { sendWhatsApp } from '../bot/whatsapp-integration';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-core';

export class WhatsappHealthcareService {
  private db: any = {
    patients: [],
    appointments: [],
    prescriptions: [],
    messages: [],
    chats: [],
    pendingVerifications: {},
    pendingActions: {},
    doctors: [
      { id: 'doc1', name: 'Dr. Arjun Mehta', specialty: 'General Physician', phone: '+919876543210', available: true, avatar: 'AM', consultationFee: 600 },
      { id: 'doc2', name: 'Dr. Priya Nair', specialty: 'Cardiologist', phone: '+919876543211', available: true, avatar: 'PN', consultationFee: 900 },
      { id: 'doc3', name: 'Dr. Ravi Kumar', specialty: 'Dermatologist', phone: '+919876543212', available: true, avatar: 'RK', consultationFee: 750 }
    ],
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
    healthTipsLogs: []
  };

  private generateDefaultSlots() {
    const slots: any[] = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
    days.forEach(day => times.forEach(time => slots.push({ id: `${day}_${time}`.replace(/[\s:]/g, '_'), day, time, booked: false, doctorId: 'doc1' })));
    return slots;
  }

  // --- Helpers ---
  logMessage(to: string, direction: string, message: string, type = 'text', patientId: string | null = null) {
    const entry = { id: uuidv4(), to, direction, message: message.substring(0, 500), type, patientId, timestamp: new Date().toISOString() };
    this.db.messages.push(entry);
    return entry;
  }

  logChat(patientId: string, doctorId: string, direction: string, text: string, type = 'text') {
    const entry = { id: uuidv4(), patientId, doctorId, direction, text, type, read: direction === 'doctor', timestamp: new Date().toISOString() };
    this.db.chats.push(entry);
    return entry;
  }

  getPatientByPhone(phone: string) {
    const clean = phone.replace(/\D/g, '');
    return this.db.patients.find((p: any) => p.phone.replace(/\D/g, '') === clean);
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
    const patient = { id: 'P' + Date.now(), ...data, verified: false, conditions: data.conditions || [], createdAt: new Date().toISOString() };
    this.db.patients.push(patient);
    // Logic for welcome and verify can go here
    return patient;
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
    const si = this.db.availableSlots.findIndex((s: any) => s.day === appt.slotDay && s.time === appt.slotTime);
    if (si !== -1) this.db.availableSlots[si].booked = true;
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

  // Port other methods as needed...
  getDb() { return this.db; }
}
