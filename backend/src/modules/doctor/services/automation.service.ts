import { AppDataSource } from '../../../config/data-source';
import { Patient } from '../../../entities/patient.entity';
import { User } from '../../../entities/user.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { DoctorAvailabilitySlot } from '../../../entities/doctor-availability-slot.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { Appointment } from '../../../entities/appointment.entity';
import { sendWhatsApp } from '../../whatsapp-healthcare/bot/whatsapp-integration';
import { In } from 'typeorm';

export class AutomationService {
  static async sendBookingInvite(patientId: string, doctorId: string, customMessage?: string) {
    const patientRepo = AppDataSource.getRepository(Patient);
    const doctorRepo = AppDataSource.getRepository(User);
    const profileRepo = AppDataSource.getRepository(DoctorProfile);
    const appointmentRepo = AppDataSource.getRepository(Appointment);

    const patient = await patientRepo.findOneBy({ id: patientId });
    if (!patient) throw new Error('Patient not found');

    const doctor = await doctorRepo.findOneBy({ id: doctorId });
    if (!doctor) throw new Error('Doctor not found');

    const doctorName = doctor.name;

    const todayObj = new Date();
    const today = todayObj.toISOString().split('T')[0];
    const tomorrowObj = new Date();
    tomorrowObj.setDate(todayObj.getDate() + 1);
    const tomorrow = tomorrowObj.toISOString().split('T')[0];

    const existingAppointments = await appointmentRepo.find({
      where: {
        doctorId,
        appointmentDate: In([today, tomorrow]),
      }
    });

    const bookedTimesByDate: Record<string, string[]> = {};
    existingAppointments.forEach(appt => {
      const dateKey = appt.appointmentDate;
      if (!bookedTimesByDate[dateKey]) bookedTimesByDate[dateKey] = [];
      if (appt.appointmentTime) bookedTimesByDate[dateKey].push(appt.appointmentTime);
    });

    const defaultTimes = ['10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
    
    let generatedSlots: { date: string, startTime: string }[] = [];
    
    [today, tomorrow].forEach(date => {
      defaultTimes.forEach(time => {
        if (!bookedTimesByDate[date]?.includes(time)) {
          generatedSlots.push({ date, startTime: time });
        }
      });
    });

    const availableSlots = generatedSlots.slice(0, 5);

    let message = `Hi ${patient.name}, Dr. ${doctorName} has the following appointment slots available:\n\n`;
    
    if (availableSlots.length > 0) {
      availableSlots.forEach((slot, index) => {
        message += `${index + 1}. ${slot.date} at ${slot.startTime}\n`;
      });
      message += `\nPlease reply with the number to confirm your booking.`;
    } else {
      message += `Currently, there are no slots available. We will notify you when slots open up.`;
    }

    if (customMessage) {
      message += `\n\nNote: ${customMessage}`;
    }

    await sendWhatsApp(patient.phone, message);
    return { success: true, message: 'Booking Invite sent successfully' };
  }

  static async sendPrescriptionEnquiry(patientId: string, doctorId: string, customMessage?: string) {
    const patientRepo = AppDataSource.getRepository(Patient);
    const prescriptionRepo = AppDataSource.getRepository(Prescription);
    const doctorRepo = AppDataSource.getRepository(User);
    const profileRepo = AppDataSource.getRepository(DoctorProfile);

    const patient = await patientRepo.findOneBy({ id: patientId });
    if (!patient) throw new Error('Patient not found');

    const doctor = await doctorRepo.findOneBy({ id: doctorId });
    const profile = await profileRepo.findOneBy({ userId: doctorId });
    const doctorName = doctor?.name || 'Doctor';

    const latestPrescriptionInfo = await prescriptionRepo.findOne({
      where: { patientId, doctorId },
      order: { createdAt: 'DESC' }
    });

    let message = `Hi ${patient.name}, here are instructions for your prescription from Dr. ${doctorName}:\n\n`;

    if (latestPrescriptionInfo) {
      const recentPrescriptions = await prescriptionRepo.find({
        where: { patientId, doctorId, prescriptionDate: latestPrescriptionInfo.prescriptionDate },
        relations: ['medicines']
      });

      let hasMedicines = false;
      recentPrescriptions.forEach(prescription => {
        if (prescription.medicines && prescription.medicines.length > 0) {
          hasMedicines = true;
          prescription.medicines.forEach(med => {
            message += `• ${med.medicineName}: ${med.dosage} (${med.instruction})\n`;
          });
        }
      });

      if (hasMedicines) {
        message += `\nDo you have any questions about how to take your medication?`;
      } else {
        message += `We could not find recent prescription details. Please contact the clinic if you have questions.`;
      }
    } else {
      message += `We could not find recent prescription details. Please contact the clinic if you have questions.`;
    }

    if (customMessage) {
      message += `\n\nNote: ${customMessage}`;
    }

    await sendWhatsApp(patient.phone, message);
    return { success: true, message: 'Prescription Enquiry sent successfully' };
  }

  static async sendFollowUpCheck(patientId: string, doctorId: string, customMessage?: string) {
    const patientRepo = AppDataSource.getRepository(Patient);
    const doctorRepo = AppDataSource.getRepository(User);
    const profileRepo = AppDataSource.getRepository(DoctorProfile);

    const patient = await patientRepo.findOneBy({ id: patientId });
    if (!patient) throw new Error('Patient not found');

    const doctor = await doctorRepo.findOneBy({ id: doctorId });
    const profile = await profileRepo.findOneBy({ userId: doctorId });
    const doctorName = doctor?.name || 'Doctor';

    let message = `Hi ${patient.name}, this is a follow-up from Dr. ${doctorName}. How are you feeling today?\n\nReply GOOD, SAME, or WORSE.`;

    if (customMessage) {
      message += `\n\n${customMessage}`;
    }

    await sendWhatsApp(patient.phone, message);
    return { success: true, message: 'Follow-Up Check sent successfully' };
  }

  static async sendCustomMessage(patientId: string, doctorId: string, customMessage: string) {
    const patientRepo = AppDataSource.getRepository(Patient);
    const doctorRepo = AppDataSource.getRepository(User);
    const profileRepo = AppDataSource.getRepository(DoctorProfile);

    const patient = await patientRepo.findOneBy({ id: patientId });
    if (!patient) throw new Error('Patient not found');

    const doctor = await doctorRepo.findOneBy({ id: doctorId });
    const profile = await profileRepo.findOneBy({ userId: doctorId });
    const doctorName = doctor?.name || 'Doctor';

    if (!customMessage) throw new Error('Message content is required');

    const message = `Message from Dr. ${doctorName}:\n\n${customMessage}`;

    await sendWhatsApp(patient.phone, message);
    return { success: true, message: 'Custom message sent successfully' };
  }
}
