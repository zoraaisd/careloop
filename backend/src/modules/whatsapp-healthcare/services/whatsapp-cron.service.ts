import { WhatsappHealthcareService } from './whatsapp-healthcare.service';
import { sendWhatsApp } from '../bot/whatsapp-integration';

export function setupWhatsappCron(service: WhatsappHealthcareService) {
  let cron: { schedule: (expression: string, task: () => Promise<void>) => void };
  try {
    cron = require('node-cron');
  } catch {
    console.warn('[WhatsApp Cron] node-cron is not installed; scheduled WhatsApp jobs are disabled.');
    return;
  }
  const db = service.getDb();

  // Daily Health Tips at 10 AM
  cron.schedule('0 10 * * *', async () => {
    const healthTipsDB: any = {
      Diabetes: ["Tip: Drink plenty of water and stay hydrated.", "Tip: Opt for whole grains over refined carbs."],
      Hypertension: ["Tip: Reduce your sodium intake today.", "Tip: A 15-minute walk can help lower blood pressure."]
    };

    for (const patient of db.patients) {
      if (!patient.verified || !patient.conditions || patient.conditions.length === 0) continue;
      for (const condition of patient.conditions) {
        const tips = healthTipsDB[condition];
        if (!tips) continue;
        const sentTips = db.healthTipsLogs.filter((l: any) => l.patientId === patient.id && l.condition === condition).map((l: any) => l.tip);
        const availableTips = tips.filter((t: string) => !sentTips.includes(t));
        if (availableTips.length > 0) {
          const selectedTip = availableTips[0];
          await sendWhatsApp(patient.phone, `🌟 *Daily Health Tip for ${condition}*\n\nHello ${patient.name},\n${selectedTip}`);
          db.healthTipsLogs.push({ id: 'HT' + Date.now(), patientId: patient.id, condition: condition, tip: selectedTip, sentAt: new Date().toISOString() });
          service.saveDb();
          break;
        }
      }
    }
  });

  // Check for missed appointments every 30 mins
  cron.schedule('*/30 * * * *', async () => {
    for (let i = 0; i < db.appointments.length; i++) {
      let appt = db.appointments[i];
      if (appt.status !== 'scheduled') continue;
      
      const apptDate = new Date(appt.createdAt);
      const diff = Date.now() - apptDate.getTime();
      const isPast = diff > 24 * 60 * 60 * 1000;

      if (isPast && !appt.rescheduleOffered) {
        db.appointments[i].status = 'missed';
        db.appointments[i].rescheduleOffered = true;
        const patient = db.patients.find((p: any) => p.id === appt.patientId);
        if (!patient) continue;
        const freeSlots = db.availableSlots.filter((s: any) => !s.booked).slice(0, 5);
        if (!freeSlots.length) continue;
        db.pendingActions[patient.phone] = { action: 'reschedule', freeSlots, doctorId: appt.doctorId, doctorName: appt.doctorName, expires: Date.now() + 2 * 60 * 60 * 1000 };
        service.saveDb();
        const slotList = freeSlots.map((s: any, idx: number) => `${idx + 1}. ${s.day} ${s.time}`).join('\n');
        const msg = `⚠️ *Missed Appointment*\n\nHello ${patient.name}, it looks like you missed your appointment with Dr. ${appt.doctorName}.\n\nWould you like to reschedule?\n📅 *Available Slots:*\n${slotList}\n\nReply with the number to confirm.`;
        await sendWhatsApp(patient.phone, msg);
      }
    }
  });

  // Morning Medication Reminders at 8 AM
  cron.schedule('0 8 * * *', async () => {
    for (const rx of db.prescriptions) {
      const patient = db.patients.find((p: any) => p.id === rx.patientId);
      if (!patient || !patient.verified) continue;
      const meds = (rx.medicines || []).filter((m: any) => {
        const t = (m.timing || '').toLowerCase();
        return t.includes('morning') || t.includes('breakfast');
      });
      if (meds.length > 0) {
        const medList = meds.map((m: any) => `💊 ${m.name} — ${m.dosage}`).join('\n');
        await sendWhatsApp(patient.phone, `⏰ *Good Morning, ${patient.name}!*\n\nTime for your morning medicines:\n\n${medList}\n\nReply *TAKEN* once done.`);
      }
    }
  });

  // Evening Medication Reminders at 8 PM
  cron.schedule('0 20 * * *', async () => {
    for (const rx of db.prescriptions) {
      const patient = db.patients.find((p: any) => p.id === rx.patientId);
      if (!patient || !patient.verified) continue;
      const meds = (rx.medicines || []).filter((m: any) => {
        const t = (m.timing || '').toLowerCase();
        return t.includes('night') || t.includes('evening') || t.includes('dinner');
      });
      if (meds.length > 0) {
        const medList = meds.map((m: any) => `💊 ${m.name} — ${m.dosage}`).join('\n');
        await sendWhatsApp(patient.phone, `🌙 *Evening Reminder, ${patient.name}!*\n\n${medList}\n\nReply *TAKEN* to confirm.`);
      }
    }
  });
}
