import { Between } from 'typeorm';

import { AppDataSource } from '../../../config/data-source';
import { Appointment } from '../../../entities/appointment.entity';
import { ExpenseActivity } from '../../../entities/expense-activity.entity';
import { Patient } from '../../../entities/patient.entity';
import { Prescription } from '../../../entities/prescription.entity';
import type { ReportResponse } from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { addDays, formatDate, parseMoney } from './doctor.utils';

export class ReportService {
  private get patientRepository() {
    return AppDataSource.getRepository(Patient);
  }
  private get appointmentRepository() {
    return AppDataSource.getRepository(Appointment);
  }
  private get prescriptionRepository() {
    return AppDataSource.getRepository(Prescription);
  }
  private get expenseRepository() {
    return AppDataSource.getRepository(ExpenseActivity);
  }
  private readonly accessService = new DoctorAccessService();

  async getReports(params: {
    dateFrom?: string;
    dateTo?: string;
  }, currentDoctorId?: string): Promise<ReportResponse> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const dateTo = params.dateTo ?? new Date().toISOString().slice(0, 10);
    const dateFrom = params.dateFrom ?? addDays(dateTo, -29);

    const [newPatients, appointments, prescriptions, expenses, patients] =
      await Promise.all([
        this.patientRepository.find({
          where: {
            createdAt: Between(
              new Date(`${dateFrom}T00:00:00.000Z`),
              new Date(`${dateTo}T23:59:59.999Z`),
            ),
            primaryDoctorId: doctorId,
          },
        }),
        this.appointmentRepository.find({
          where: { appointmentDate: Between(dateFrom, dateTo), doctorId },
          relations: { patient: true },
        }),
        this.prescriptionRepository.find({
          where: { prescriptionDate: Between(dateFrom, dateTo), doctorId },
          relations: { patient: true },
        }),
        this.expenseRepository.find({
          where: { date: Between(dateFrom, dateTo) },
        }),
        this.patientRepository.find({
          where: { isActive: true, primaryDoctorId: doctorId },
        }),
      ]);

    const revenue = appointments.reduce(
      (sum, appointment) => sum + parseMoney(appointment.billingAmount),
      0,
    );
    const expenseTotal = expenses.reduce(
      (sum, expense) => sum + parseMoney(expense.amount),
      0,
    );

    return {
      filters: {
        dateFrom,
        dateTo,
      },
      summary: {
        newPatients: newPatients.length,
        appointments: appointments.length,
        revenue,
        expenses: expenseTotal,
        net: revenue - expenseTotal,
        averageBilling: appointments.length === 0 ? 0 : revenue / appointments.length,
      },
      patients: patients.map((patient) => {
        const patientAppointments = appointments.filter(
          (appointment) => appointment.patientId === patient.id,
        );
        const patientPrescriptions = prescriptions.filter(
          (prescription) => prescription.patientId === patient.id,
        );

        return {
          patientId: patient.id,
          patientName: patient.name,
          phone: patient.phone,
          appointmentCount: patientAppointments.length,
          prescriptionCount: patientPrescriptions.length,
          revenue: patientAppointments.reduce(
            (sum, appointment) => sum + parseMoney(appointment.billingAmount),
            0,
          ),
          lastVisit: formatDate(patient.lastVisitAt),
          status: patient.verificationStatus,
        };
      }),
    };
  }
}
