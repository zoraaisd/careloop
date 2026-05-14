import fs from 'node:fs';
import ExcelJS from 'exceljs';
import { Between, In, IsNull } from 'typeorm';

import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { Appointment } from '../../../entities/appointment.entity';
import { ExpenseActivity } from '../../../entities/expense-activity.entity';
import { FollowUp, FollowUpEntryStatus } from '../../../entities/follow-up.entity';
import { InventoryItem } from '../../../entities/inventory-item.entity';
import { Patient } from '../../../entities/patient.entity';
import { PatientDocument } from '../../../entities/patient-document.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { PatientPayment } from '../../../entities/patient-payment.entity';
import { User, UserRole } from '../../../entities/user.entity';
import type {
  ReportDailyRow,
  ReportDoctorOption,
  ReportPatientHistory,
  ReportPatientHistoryAppointment,
  ReportPatientHistoryDocument,
  ReportPatientHistoryNote,
  ReportPatientHistoryPrescription,
  ReportPatientOption,
  ReportPatientRow,
  ReportResponse,
  ReportViewResponse,
} from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { addDays, formatDateOnly, parseMoney } from './doctor.utils';

type ReportType = 'patient' | 'revenue' | 'inventory' | 'expenses';
type ExportFormat = 'csv' | 'sheet' | 'pdf';

type ReportQueryParams = {
  dateFrom?: string;
  dateTo?: string;
  doctorId?: string;
  patientId?: string;
  reportType?: ReportType;
};

type ReportDataset = {
  filters: ReportResponse['filters'];
  doctors: ReportDoctorOption[];
  patientOptions: ReportPatientOption[];
  summary: ReportResponse['summary'];
  daily: ReportDailyRow[];
  patients: ReportPatientRow[];
  selectedPatientHistory: ReportPatientHistory | null;
};

type ReportContext = {
  currentDoctorId: string;
  dateFrom: string;
  dateTo: string;
  scopedDoctorIds: string[];
  activeDoctorIds: string[];
  selectedDoctorId: string | null;
  selectedPatientId: string | null;
  doctorOptions: ReportDoctorOption[];
  clinicId: string | null;
};

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

  private get patientDocumentRepository() {
    return AppDataSource.getRepository(PatientDocument);
  }

  private get expenseRepository() {
    return AppDataSource.getRepository(ExpenseActivity);
  }

  private get followUpRepository() {
    return AppDataSource.getRepository(FollowUp);
  }

  private get userRepository() {
    return AppDataSource.getRepository(User);
  }

  private get inventoryRepository() {
    return AppDataSource.getRepository(InventoryItem);
  }

  private get patientPaymentRepository() {
    return AppDataSource.getRepository(PatientPayment);
  }

  private readonly accessService = new DoctorAccessService();

  async getReports(
    params: ReportQueryParams,
    currentDoctorId?: string,
  ): Promise<ReportResponse> {
    return this.buildPatientDataset(params, currentDoctorId);
  }

  async getReportView(
    params: ReportQueryParams,
    currentDoctorId?: string,
  ): Promise<ReportViewResponse> {
    const context = await this.buildContext(params, currentDoctorId);
    const reportType = params.reportType ?? 'patient';

    switch (reportType) {
      case 'revenue':
        return this.buildRevenueView(context);
      case 'inventory':
        return this.buildInventoryView(context);
      case 'expenses':
        return this.buildExpenseView(context);
      case 'patient':
      default:
        return this.buildPatientView(context);
    }
  }

  async exportReport(
    params: ReportQueryParams,
    currentDoctorId?: string,
    format: ExportFormat = 'csv',
  ): Promise<{ fileName: string; content: string | Buffer; contentType: string }> {
    const view = await this.getReportView(params, currentDoctorId);

    switch (format) {
      case 'pdf':
        return this.exportReportPdf(view);
      case 'sheet':
        return this.exportReportSheet(view);
      case 'csv':
      default:
        return this.exportReportCsv(view);
    }
  }

  private async buildContext(
    params: ReportQueryParams,
    currentDoctorId?: string,
  ): Promise<ReportContext> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const accessState = await this.accessService.getAccessState(currentDoctorId);
    const dateTo = params.dateTo ?? new Date().toISOString().slice(0, 10);
    const dateFrom = params.dateFrom ?? addDays(dateTo, -6);
    const scopedDoctorIds = await this.accessService.getClinicDoctorIds(doctorId);
    const doctors = await this.userRepository.find({
      where: {
        id: In(scopedDoctorIds),
        role: UserRole.DOCTOR,
      },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });

    const selectedDoctorId =
      typeof params.doctorId === 'string' && params.doctorId.trim().length > 0
        ? params.doctorId.trim()
        : null;
    const selectedPatientId =
      typeof params.patientId === 'string' && params.patientId.trim().length > 0
        ? params.patientId.trim()
        : null;

    if (selectedDoctorId && !scopedDoctorIds.includes(selectedDoctorId)) {
      throw new AppError('Selected doctor is outside your clinic scope', 403);
    }

    if (selectedPatientId) {
      const selectedPatient = await this.patientRepository.findOne({
        where: {
          id: selectedPatientId,
          isActive: true,
        },
        select: ['id', 'primaryDoctorId'],
      });

      if (!selectedPatient || !selectedPatient.primaryDoctorId || !scopedDoctorIds.includes(selectedPatient.primaryDoctorId)) {
        throw new AppError('Selected patient is outside your clinic scope', 403);
      }

      if (selectedDoctorId && selectedPatient.primaryDoctorId !== selectedDoctorId) {
        throw new AppError('Selected patient does not belong to the chosen doctor', 400);
      }
    }

    return {
      currentDoctorId: doctorId,
      dateFrom,
      dateTo,
      scopedDoctorIds,
      activeDoctorIds: selectedDoctorId ? [selectedDoctorId] : scopedDoctorIds,
      selectedDoctorId,
      selectedPatientId,
      doctorOptions: doctors.map((doctor) => ({
        doctorId: doctor.id,
        doctorName: doctor.name,
      })),
      clinicId: accessState.clinicId ?? null,
    };
  }

  private async buildPatientDataset(
    params: ReportQueryParams,
    currentDoctorId?: string,
  ): Promise<ReportDataset> {
    const context = await this.buildContext(params, currentDoctorId);

    const [patients, appointments, prescriptions, expenses, followUps] = await Promise.all([
      this.patientRepository.find({
        where: {
          isActive: true,
          primaryDoctorId: In(context.activeDoctorIds),
        },
        relations: {
          primaryDoctor: true,
        },
        order: {
          createdAt: 'ASC',
          name: 'ASC',
        },
      }),
      this.appointmentRepository.find({
        where: {
          appointmentDate: Between(context.dateFrom, context.dateTo),
          doctorId: In(context.activeDoctorIds),
        },
        relations: {
          patient: true,
          doctor: true,
        },
        order: {
          appointmentDate: 'DESC',
          appointmentTime: 'DESC',
        },
      }),
      this.prescriptionRepository.find({
        where: {
          prescriptionDate: Between(context.dateFrom, context.dateTo),
          doctorId: In(context.activeDoctorIds),
        },
      }),
      this.listScopedExpenses(context),
      this.followUpRepository.find({
        where: {
          doctorId: In(context.activeDoctorIds),
          status: FollowUpEntryStatus.PENDING,
        },
        order: {
          scheduledAt: 'ASC',
        },
      }),
    ]);

    const availablePatients = patients
      .map((patient, index) => ({
        patient,
        patientCode: this.formatSequenceCode('PAD', index + 1),
      }));
    const patientOptions = availablePatients.map(({ patient, patientCode }) => ({
      patientId: patient.id,
      patientCode,
      patientName: patient.name,
      phone: patient.phone,
    }));
    const filteredPatients = context.selectedPatientId
      ? availablePatients.filter(({ patient }) => patient.id === context.selectedPatientId)
      : availablePatients;

    const doctorNameById = new Map(
      context.doctorOptions.map((doctor) => [doctor.doctorId, doctor.doctorName]),
    );
    const newPatientsWithinRange = filteredPatients.map(({ patient }) => patient).filter((patient) => {
      const createdDate = formatDateOnly(patient.createdAt);
      return createdDate >= context.dateFrom && createdDate <= context.dateTo;
    });
    const followUpsWithinRange = followUps.filter((followUp) => {
      const scheduledDate = formatDateOnly(followUp.scheduledAt);
      return scheduledDate >= context.dateFrom && scheduledDate <= context.dateTo;
    });
    const daily = this.buildDailyRows({
      dateFrom: context.dateFrom,
      dateTo: context.dateTo,
      patients: filteredPatients.map(({ patient }) => patient),
      appointments: context.selectedPatientId
        ? appointments.filter((appointment) => appointment.patientId === context.selectedPatientId)
        : appointments,
      prescriptions: context.selectedPatientId
        ? prescriptions.filter((prescription) => prescription.patientId === context.selectedPatientId)
        : prescriptions,
      expenses,
      followUps: followUpsWithinRange,
    });
    const scopedAppointments = context.selectedPatientId
      ? appointments.filter((appointment) => appointment.patientId === context.selectedPatientId)
      : appointments;
    const scopedPrescriptions = context.selectedPatientId
      ? prescriptions.filter((prescription) => prescription.patientId === context.selectedPatientId)
      : prescriptions;
    const scopedFollowUps = context.selectedPatientId
      ? followUps.filter((followUp) => followUp.patientId === context.selectedPatientId)
      : followUps;
    const revenueGenerated = scopedAppointments.reduce(
      (sum, appointment) => sum + parseMoney(appointment.billingAmount),
      0,
    );
    const expenseTotal = expenses.reduce(
      (sum, expense) => sum + parseMoney(expense.amount),
      0,
    );
    const patientRows = filteredPatients
      .map(({ patient, patientCode }) =>
        this.buildPatientRow({
          patient,
          patientCode,
          appointments: scopedAppointments,
          prescriptions: scopedPrescriptions,
          followUps: scopedFollowUps,
          doctorNameById,
        }),
      )
      .sort((left, right) => {
        const registeredDateCompare = left.registeredDate.localeCompare(right.registeredDate);

        if (registeredDateCompare !== 0) {
          return registeredDateCompare;
        }

        return left.patientName.localeCompare(right.patientName);
      });

    return {
      filters: {
        dateFrom: context.dateFrom,
        dateTo: context.dateTo,
        doctorId: context.selectedDoctorId,
      },
      doctors: context.doctorOptions,
      patientOptions,
      summary: {
        totalPatients: filteredPatients.length,
        newPatients: newPatientsWithinRange.length,
        totalVisits: scopedAppointments.length,
        prescriptions: scopedPrescriptions.length,
        followUpPending: scopedFollowUps.filter((followUp) => {
          const scheduledDate = formatDateOnly(followUp.scheduledAt);
          return scheduledDate >= context.dateFrom && scheduledDate <= context.dateTo;
        }).length,
        revenueGenerated,
        expenses: expenseTotal,
        net: revenueGenerated - expenseTotal,
        averageBilling: scopedAppointments.length > 0 ? revenueGenerated / scopedAppointments.length : 0,
      },
      daily,
      patients: patientRows,
      selectedPatientHistory:
        context.selectedPatientId && filteredPatients[0]
          ? await this.buildPatientHistory({
              patient: filteredPatients[0].patient,
              patientCode: filteredPatients[0].patientCode,
              doctorNameById,
              activeDoctorIds: context.activeDoctorIds,
            })
          : null,
    };
  }

  private async buildPatientView(context: ReportContext): Promise<ReportViewResponse> {
    const report = await this.buildPatientDataset(
      {
        dateFrom: context.dateFrom,
        dateTo: context.dateTo,
        doctorId: context.selectedDoctorId ?? undefined,
        patientId: context.selectedPatientId ?? undefined,
      },
      context.currentDoctorId,
    );

    return {
      filters: {
        reportType: 'patient',
        dateFrom: context.dateFrom,
        dateTo: context.dateTo,
        doctorId: context.selectedDoctorId,
        patientId: context.selectedPatientId,
      },
      title: 'Patient Report',
      doctors: context.doctorOptions,
      patientOptions: report.patientOptions,
      metrics: [
        { label: 'Total Patients', value: String(report.summary.totalPatients) },
        { label: 'New Patients', value: String(report.summary.newPatients) },
        { label: 'Total Visits', value: String(report.summary.totalVisits) },
        { label: 'Follow-up Pending', value: String(report.summary.followUpPending) },
        { label: 'Revenue Generated', value: this.formatCurrency(report.summary.revenueGenerated) },
      ],
      columns: [
        { key: 'patientId', label: 'Patient ID' },
        { key: 'patientName', label: 'Patient Name' },
        { key: 'ageGender', label: 'Age / Gender' },
        { key: 'doctorName', label: 'Doctor' },
        { key: 'phone', label: 'Mobile' },
        { key: 'registeredDate', label: 'Reg. Date' },
        { key: 'totalVisits', label: 'Total Visits', align: 'right' },
      ],
      rows: report.patients.map((patient) => ({
        patientId: patient.patientCode,
        internalPatientId: patient.patientId,
        patientName: patient.patientName,
        ageGender: `${patient.age} / ${patient.gender ?? 'NA'}`,
        doctorName: patient.doctorName,
        phone: patient.phone,
        registeredDate: formatDateOnly(patient.registeredDate),
        lastVisit: patient.lastVisit ?? '--',
        totalVisits: patient.totalVisits,
        prescriptionCount: patient.prescriptionCount,
        followUpDate: patient.followUpDate ?? '--',
        billingAmount: this.formatCurrency(patient.billingAmount),
        status: patient.status === 'verified' ? 'Active' : 'Pending',
      })),
      selectedPatientHistory: report.selectedPatientHistory,
      exportFileName: `patient_report_${context.dateFrom}_to_${context.dateTo}.csv`,
    };
  }

  private async buildRevenueView(context: ReportContext): Promise<ReportViewResponse> {
    const appointments = await this.appointmentRepository.find({
      where: {
        appointmentDate: Between(context.dateFrom, context.dateTo),
        doctorId: In(context.activeDoctorIds),
      },
      relations: {
        patient: true,
        doctor: true,
      },
      order: {
        appointmentDate: 'DESC',
        appointmentTime: 'DESC',
      },
    });

    const payments = await this.patientPaymentRepository.find({
      where: {
        createdAt: Between(new Date(context.dateFrom), new Date(`${context.dateTo}T23:59:59.999Z`)),
        doctorId: In(context.activeDoctorIds),
      },
      relations: {
        patient: true,
        doctor: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const appointmentRows = appointments.map((appointment, index) => {
      const amount = parseMoney(appointment.billingAmount);
      return {
        id: appointment.id,
        date: appointment.appointmentDate,
        dateTime: new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}:00`),
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.name,
        consultationFee: amount,
        patientFee: 0,
        totalAmount: amount,
        paymentMethod: 'N/A',
        paymentStatus: appointment.status === 'done' ? 'Paid' : 'Pending',
        type: 'Appointment',
      };
    });

    const paymentRows = payments.map((payment) => {
      return {
        id: payment.id,
        date: formatDateOnly(payment.createdAt),
        dateTime: payment.createdAt,
        patientName: payment.patient.name,
        doctorName: payment.doctor.name,
        consultationFee: parseMoney(payment.consultationFee),
        patientFee: parseMoney(payment.patientFee),
        totalAmount: parseMoney(payment.amount),
        paymentMethod: payment.paymentMethod.toUpperCase(),
        paymentStatus: 'Paid',
        type: 'Fee Payment',
      };
    });

    const allRows = [...appointmentRows, ...paymentRows].sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());

    const totalRevenue = allRows.reduce((sum, row) => sum + row.totalAmount, 0);
    const paidAmount = allRows
      .filter((row) => row.paymentStatus === 'Paid')
      .reduce((sum, row) => sum + row.totalAmount, 0);
    const pendingAmount = totalRevenue - paidAmount;
    
    const daysCount = Math.max(1, new Set(allRows.map((item) => item.date)).size);
    const doctorRevenue = allRows.reduce((map, row) => {
      map.set(
        row.doctorName,
        (map.get(row.doctorName) ?? 0) + row.totalAmount,
      );
      return map;
    }, new Map<string, number>());
    const topDoctor = Array.from(doctorRevenue.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      filters: {
        reportType: 'revenue',
        dateFrom: context.dateFrom,
        dateTo: context.dateTo,
        doctorId: context.selectedDoctorId,
      },
      title: 'Revenue Report',
      doctors: context.doctorOptions,
      metrics: [
        { label: 'Total Revenue', value: this.formatCurrency(totalRevenue) },
        { label: 'Paid Amount', value: this.formatCurrency(paidAmount) },
        { label: 'Pending Amount', value: this.formatCurrency(pendingAmount) },
        { label: 'Avg. Revenue / Day', value: this.formatCurrency(totalRevenue / daysCount) },
        {
          label: 'Top Doctor',
          value: topDoctor?.[0] ?? 'N/A',
          helperText: topDoctor ? this.formatCurrency(topDoctor[1]) : 'No revenue',
        },
      ],
      columns: [
        { key: 'invoiceId', label: 'Invoice ID' },
        { key: 'date', label: 'Date / Time' },
        { key: 'patientName', label: 'Patient Name' },
        { key: 'doctorName', label: 'Doctor' },
        { key: 'consultationFee', label: 'Consult. Fee', align: 'right' },
        { key: 'patientFee', label: 'Patient Fee', align: 'right' },
        { key: 'totalAmount', label: 'Total Amount', align: 'right' },
      ],
      rows: allRows.map((row, index) => {
        return {
          invoiceId: this.formatSequenceCode(row.type === 'Appointment' ? 'APT' : 'PAY', index + 1),
          date: row.dateTime.toLocaleString(),
          patientName: row.patientName,
          doctorName: row.doctorName,
          method: row.paymentMethod,
          consultationFee: this.formatCurrency(row.consultationFee),
          patientFee: this.formatCurrency(row.patientFee),
          totalAmount: this.formatCurrency(row.totalAmount),
          paymentStatus: row.paymentStatus,
        };
      }),
      exportFileName: `revenue_report_${context.dateFrom}_to_${context.dateTo}.csv`,
    };
  }

  private async buildInventoryView(context: ReportContext): Promise<ReportViewResponse> {
    const items = await this.inventoryRepository.find({
      where: context.clinicId ? { clinicId: context.clinicId } : {},
      order: {
        updatedAt: 'DESC',
      },
    });

    const orderedItems = [...items].sort((left, right) => {
      const createdAtCompare = left.createdAt.getTime() - right.createdAt.getTime();

      if (createdAtCompare !== 0) {
        return createdAtCompare;
      }

      return left.itemName.localeCompare(right.itemName);
    });

    const totalStockValue = items.reduce(
      (sum, item) => sum + parseMoney(item.sellingPrice) * item.quantity,
      0,
    );
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockCount = items.filter(
      (item) => item.quantity > 0 && item.quantity <= item.reorderLevel,
    ).length;
    const outOfStockCount = items.filter((item) => item.quantity <= 0).length;
    const nearExpiryCount = items.filter((item) => {
      if (!item.expiryDate) {
        return false;
      }

      const expiryDate = new Date(item.expiryDate);
      const diff = expiryDate.getTime() - Date.now();
      return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      filters: {
        reportType: 'inventory',
        dateFrom: context.dateFrom,
        dateTo: context.dateTo,
        doctorId: null,
      },
      title: 'Inventory Report',
      doctors: context.doctorOptions,
      metrics: [
        { label: 'Total Items', value: String(items.length), helperText: `${totalUnits} units available` },
        { label: 'In Stock', value: String(items.length - outOfStockCount) },
        { label: 'Low Stock', value: String(lowStockCount), helperText: 'Needs attention' },
        { label: 'Out of Stock', value: String(outOfStockCount) },
        { label: 'Near Expiry', value: String(nearExpiryCount), helperText: 'Within 30 days' },
      ],
      columns: [
        { key: 'itemId', label: 'Item ID' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'category', label: 'Category' },
        { key: 'unit', label: 'Unit' },
        { key: 'inStock', label: 'In Stock', align: 'right' },
        { key: 'reorderLevel', label: 'Reorder Level', align: 'right' },
        { key: 'expiryDate', label: 'Expiry Date' },
        { key: 'status', label: 'Status', kind: 'status' },
        { key: 'lastUpdated', label: 'Last Updated' },
      ],
      rows: orderedItems.map((item, index) => {
        const status =
          item.quantity <= 0 ? 'Out of Stock' : item.quantity <= item.reorderLevel ? 'Low Stock' : 'In Stock';
        return {
          itemId: this.formatSequenceCode('ITM', index + 1),
          itemName: item.itemName,
          supplier: item.vendor ?? '--',
          category: item.category,
          unit: item.unit,
          inStock: item.quantity,
          reorderLevel: item.reorderLevel,
          expiryDate: item.expiryDate ? formatDateOnly(item.expiryDate) : '--',
          status,
          lastUpdated: item.updatedAt.toISOString(),
        };
      }),
      exportFileName: `inventory_report_${context.dateFrom}_to_${context.dateTo}.csv`,
    };
  }

  private async buildExpenseView(context: ReportContext): Promise<ReportViewResponse> {
    const expenses = await this.listScopedExpenses(context);
    const filteredExpenses = expenses.filter(
      (expense) => expense.date >= context.dateFrom && expense.date <= context.dateTo,
    );
    const orderedExpenses = [...filteredExpenses].sort((left, right) => {
      const dateCompare = left.date.localeCompare(right.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      const createdAtCompare = left.createdAt.getTime() - right.createdAt.getTime();

      if (createdAtCompare !== 0) {
        return createdAtCompare;
      }

      return left.title.localeCompare(right.title);
    });
    const totalExpenses = filteredExpenses.reduce(
      (sum, expense) => sum + parseMoney(expense.amount),
      0,
    );
    const daysCount = Math.max(1, new Set(filteredExpenses.map((item) => item.date)).size);
    const categoryTotals = filteredExpenses.reduce((map, expense) => {
      map.set(expense.category, (map.get(expense.category) ?? 0) + parseMoney(expense.amount));
      return map;
    }, new Map<string, number>());
    const highestCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      filters: {
        reportType: 'expenses',
        dateFrom: context.dateFrom,
        dateTo: context.dateTo,
        doctorId: context.selectedDoctorId,
      },
      title: 'Expenses Report',
      doctors: context.doctorOptions,
      metrics: [
        { label: 'Total Expenses', value: this.formatCurrency(totalExpenses) },
        {
          label: 'Operational Expenses',
          value: this.formatCurrency(
            filteredExpenses
              .filter((expense) =>
                ['rent', 'salary', 'utilities', 'supplies'].includes(expense.category.toLowerCase()),
              )
              .reduce((sum, expense) => sum + parseMoney(expense.amount), 0),
          ),
        },
        {
          label: 'Other Expenses',
          value: this.formatCurrency(
            filteredExpenses
              .filter((expense) =>
                !['rent', 'salary', 'utilities', 'supplies'].includes(expense.category.toLowerCase()),
              )
              .reduce((sum, expense) => sum + parseMoney(expense.amount), 0),
          ),
        },
        { label: 'Avg. Expense / Day', value: this.formatCurrency(totalExpenses / daysCount) },
        {
          label: 'Highest Category',
          value: highestCategory?.[0] ?? 'N/A',
          helperText: highestCategory ? this.formatCurrency(highestCategory[1]) : 'No expenses',
        },
      ],
      columns: [
        { key: 'expenseId', label: 'Expense ID' },
        { key: 'date', label: 'Date' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: orderedExpenses.map((expense, index) => ({
        expenseId: this.formatSequenceCode('EXP', index + 1),
        date: expense.date,
        supplier: '--',
        category: expense.category,
        description: expense.title,
        amount: this.formatCurrency(parseMoney(expense.amount)),
        type: expense.type,
      })),
      exportFileName: `expenses_report_${context.dateFrom}_to_${context.dateTo}.csv`,
    };
  }

  private async listScopedExpenses(context: ReportContext): Promise<ExpenseActivity[]> {
    const baseConditions = context.clinicId
      ? [{ clinicId: context.clinicId }, { clinicId: IsNull() }]
      : {};

    const expenses = await this.expenseRepository.find({
      where: baseConditions as any,
      order: {
        date: 'DESC',
        createdAt: 'DESC',
      },
    });

    if (!context.selectedDoctorId) {
      return expenses;
    }

    return expenses.filter(
      (expense) => !expense.createdByDoctorId || expense.createdByDoctorId === context.selectedDoctorId,
    );
  }

  private exportReportCsv(
    view: ReportViewResponse,
  ): { fileName: string; content: string; contentType: string } {
    const rows = this.buildExportRows(view);

    return {
      fileName: view.exportFileName,
      content: rows.map((row) => row.map((value) => this.escapeCsv(value)).join(',')).join('\n'),
      contentType: 'text/csv; charset=utf-8',
    };
  }

  private async exportReportSheet(
    view: ReportViewResponse,
  ): Promise<{ fileName: string; content: Buffer; contentType: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CareLoop';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(this.getWorksheetName(view.title));
    const maxColumnCount = Math.max(3, view.columns.length);
    const border = {
      top: { style: 'thin' as const, color: { argb: 'FFDCE4E0' } },
      left: { style: 'thin' as const, color: { argb: 'FFDCE4E0' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFDCE4E0' } },
      right: { style: 'thin' as const, color: { argb: 'FFDCE4E0' } },
    };
    const headerFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFF5FAF7' },
    };

    worksheet.addRow([view.title]);
    worksheet.mergeCells(1, 1, 1, maxColumnCount);
    worksheet.getRow(1).font = { bold: true, size: 14 };

    worksheet.addRow([]);
    worksheet.addRow(['Date From', view.filters.dateFrom]);
    worksheet.addRow(['Date To', view.filters.dateTo]);
    worksheet.addRow(['Doctor', this.getSelectedDoctorLabel(view)]);

    for (const rowIndex of [3, 4, 5]) {
      worksheet.getRow(rowIndex).getCell(1).font = { bold: true };
      worksheet.getRow(rowIndex).getCell(1).fill = headerFill;
    }

    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    worksheet.getRow(7).font = { bold: true, size: 12 };
    worksheet.addRow(['Metric', 'Value', 'Helper']);
    worksheet.getRow(8).font = { bold: true };
    worksheet.getRow(8).eachCell((cell: any) => {
      cell.fill = headerFill;
    });

    for (const metric of view.metrics) {
      worksheet.addRow([metric.label, metric.value, metric.helperText ?? '--']);
    }

    worksheet.addRow([]);
    const detailsTitleRowIndex = worksheet.rowCount + 1;
    worksheet.addRow([`${view.title} Details`]);
    worksheet.getRow(detailsTitleRowIndex).font = { bold: true, size: 12 };

    const detailsHeaderRowIndex = worksheet.rowCount + 1;
    worksheet.addRow(view.columns.map((column) => column.label));
    worksheet.getRow(detailsHeaderRowIndex).font = { bold: true };
    worksheet.getRow(detailsHeaderRowIndex).eachCell((cell: any) => {
      cell.fill = headerFill;
    });

    for (const row of view.rows) {
      worksheet.addRow(view.columns.map((column) => String(row[column.key] ?? '--')));
    }

    worksheet.eachRow((row: any) => {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        cell.border = border;
      });
    });

    for (let columnIndex = 1; columnIndex <= maxColumnCount; columnIndex += 1) {
      const column = worksheet.getColumn(columnIndex);
      let maxLength = 16;

      column.eachCell({ includeEmpty: true }, (cell: any) => {
        const valueLength = String(cell.value ?? '').length;
        if (valueLength > maxLength) {
          maxLength = Math.min(valueLength + 4, 40);
        }
      });

      column.width = maxLength;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      fileName: this.replaceFileExtension(view.exportFileName, 'xlsx'),
      content: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private async exportReportPdf(
    view: ReportViewResponse,
  ): Promise<{ fileName: string; content: Buffer; contentType: string }> {
    const puppeteer = require('puppeteer-core');
    const executablePath = this.findBrowserExecutable();

    if (!executablePath) {
      throw new AppError('PDF export is unavailable because no local Chrome or Edge browser was found.', 503);
    }

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(this.renderReportHtml(view, { titleSuffix: 'PDF Export' }), {
        waitUntil: 'networkidle0',
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '16mm',
          right: '12mm',
          bottom: '16mm',
          left: '12mm',
        },
      });

      return {
        fileName: this.replaceFileExtension(view.exportFileName, 'pdf'),
        content: Buffer.from(pdfBuffer),
        contentType: 'application/pdf',
      };
    } finally {
      await browser.close();
    }
  }

  private buildExportRows(view: ReportViewResponse): string[][] {
    const baseRows = [
      ['Report Type', view.title],
      ['Date From', view.filters.dateFrom],
      ['Date To', view.filters.dateTo],
      ['Doctor', this.getSelectedDoctorLabel(view)],
      [],
      ['Summary'],
      ['Metric', 'Value', 'Helper'],
      ...view.metrics.map((metric) => [metric.label, metric.value, metric.helperText ?? '']),
      [],
      [view.title],
      view.columns.map((column) => column.label),
      ...view.rows.map((row) => view.columns.map((column) => String(row[column.key] ?? ''))),
    ];

    if (!view.selectedPatientHistory) {
      return baseRows;
    }

    const history = view.selectedPatientHistory;
    return [
      ...baseRows,
      [],
      ['Patient Basic Details'],
      ['Field', 'Value'],
      ['Patient ID', history.basicDetails.patientCode],
      ['Patient Name', history.basicDetails.patientName],
      ['Age / Gender', `${history.basicDetails.age} / ${history.basicDetails.gender ?? 'NA'}`],
      ['Assigned Doctor', history.basicDetails.assignedDoctor],
      ['Mobile', history.basicDetails.phone],
      ['Email', history.basicDetails.email ?? '--'],
      ['Blood Group', history.basicDetails.bloodGroup ?? '--'],
      ['Registration Date', history.basicDetails.registrationDate],
      ['Total Visits', String(history.basicDetails.totalVisits)],
      [],
      ['Medical History'],
      ['Field', 'Value'],
      ['Allergies', history.medicalHistory.allergies ?? '--'],
      ['Chronic Diseases', history.medicalHistory.chronicDiseases ?? '--'],
      ['Past Surgeries', history.medicalHistory.pastSurgeries ?? '--'],
      ['Previous Treatments', history.medicalHistory.previousTreatments ?? '--'],
      ['Health Problem', history.medicalHistory.healthProblem ?? '--'],
      ['Weight', history.medicalHistory.weight ?? '--'],
      ['Height', history.medicalHistory.height ?? '--'],
      ['BP', history.medicalHistory.bp ?? '--'],
      ['Sugar', history.medicalHistory.sugar ?? '--'],
      ['Additional Notes', history.medicalHistory.additionalNotes ?? '--'],
      [],
      ['Appointment History'],
      ['Date', 'Time', 'Doctor', 'Type', 'Status', 'Billing Amount', 'Notes'],
      ...history.appointmentHistory.map((item) => [
        item.date,
        item.time,
        item.doctorName,
        item.appointmentType,
        item.status,
        item.billingAmount,
        item.notes ?? '--',
      ]),
      [],
      ['Prescription History'],
      ['Date', 'Doctor', 'Diagnosis', 'Medicines', 'Notes'],
      ...history.prescriptionHistory.map((item) => [
        item.date,
        item.doctorName,
        item.diagnosis,
        item.medicines.join(', ') || '--',
        item.notes ?? '--',
      ]),
      [],
      ['Uploaded Reports / Files'],
      ['File Name', 'File Type', 'Uploaded At', 'File URL'],
      ...history.uploadedReports.map((item) => [item.fileName, item.fileType, item.uploadedAt, item.fileUrl]),
      [],
      ['Doctor Notes'],
      ['Date', 'Source', 'Note'],
      ...history.doctorNotes.map((item) => [item.date, item.source, item.note]),
    ];
  }

  private getSelectedDoctorLabel(view: ReportViewResponse): string {
    return view.filters.doctorId === null
      ? 'All Doctors'
      : view.doctors.find((doctor) => doctor.doctorId === view.filters.doctorId)?.doctorName ??
          'Selected Doctor';
  }

  private renderReportHtml(
    view: ReportViewResponse,
    options: { titleSuffix: string; includeExcelNamespaces?: boolean },
  ): string {
    const summaryRows = view.metrics
      .map(
        (metric) => `
          <tr>
            <td>${this.escapeHtml(metric.label)}</td>
            <td>${this.escapeHtml(metric.value)}</td>
            <td>${this.escapeHtml(metric.helperText ?? '--')}</td>
          </tr>`,
      )
      .join('');
    const tableHeaders = view.columns
      .map((column) => `<th>${this.escapeHtml(column.label)}</th>`)
      .join('');
    const tableRows = view.rows
      .map(
        (row) => `
          <tr>
            ${view.columns
              .map((column) => `<td>${this.escapeHtml(String(row[column.key] ?? '--'))}</td>`)
              .join('')}
          </tr>`,
      )
      .join('');
    const patientHistorySection = view.selectedPatientHistory
      ? this.renderPatientHistoryHtml(view.selectedPatientHistory)
      : '';
    const htmlAttrs = options.includeExcelNamespaces
      ? 'xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"'
      : '';

    return `<!DOCTYPE html>
<html ${htmlAttrs}>
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(view.title)} ${this.escapeHtml(options.titleSuffix)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #173a31; margin: 24px; }
      h1 { margin: 0 0 16px; color: #142e26; font-size: 24px; }
      .meta, .summary, .report-table { width: 100%; border-collapse: collapse; margin-top: 16px; table-layout: auto; }
      .meta td { padding: 8px 10px; border: 1px solid #dce4e0; min-width: 180px; }
      .summary th, .summary td, .report-table th, .report-table td {
        border: 1px solid #dce4e0;
        padding: 8px 10px;
        text-align: left;
        vertical-align: top;
        min-width: 140px;
        white-space: nowrap;
      }
      .summary th, .report-table th {
        background: #f5faf7;
        color: #142e26;
        font-weight: 700;
      }
      .summary td, .report-table td {
        mso-number-format: "\\@";
      }
      .section-title { margin-top: 24px; font-size: 16px; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>${this.escapeHtml(view.title)}</h1>
    <table class="meta">
      <tr><td><strong>Date From</strong></td><td>${this.escapeHtml(view.filters.dateFrom)}</td></tr>
      <tr><td><strong>Date To</strong></td><td>${this.escapeHtml(view.filters.dateTo)}</td></tr>
      <tr><td><strong>Doctor</strong></td><td>${this.escapeHtml(this.getSelectedDoctorLabel(view))}</td></tr>
    </table>
    <div class="section-title">Summary</div>
    <table class="summary">
      <thead>
        <tr><th>Metric</th><th>Value</th><th>Helper</th></tr>
      </thead>
      <tbody>${summaryRows}</tbody>
    </table>
    <div class="section-title">${this.escapeHtml(view.title)} Details</div>
    <table class="report-table">
      <thead><tr>${tableHeaders}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    ${patientHistorySection}
  </body>
</html>`;
  }

  private buildDailyRows(params: {
    dateFrom: string;
    dateTo: string;
    patients: Patient[];
    appointments: Appointment[];
    prescriptions: Prescription[];
    expenses: ExpenseActivity[];
    followUps: FollowUp[];
  }): ReportDailyRow[] {
    const rows: ReportDailyRow[] = [];

    for (
      let currentDate = params.dateFrom;
      currentDate <= params.dateTo;
      currentDate = addDays(currentDate, 1)
    ) {
      const dayAppointments = params.appointments.filter((appointment) => appointment.appointmentDate === currentDate);
      const dayPrescriptions = params.prescriptions.filter((prescription) => prescription.prescriptionDate === currentDate);
      const dayExpenses = params.expenses.filter((expense) => expense.date === currentDate);
      const dayFollowUps = params.followUps.filter((followUp) => formatDateOnly(followUp.scheduledAt) === currentDate);
      const dayPatients = params.patients.filter((patient) => formatDateOnly(patient.createdAt) === currentDate);
      const revenueGenerated = dayAppointments.reduce((sum, appointment) => sum + parseMoney(appointment.billingAmount), 0);
      const expenses = dayExpenses.reduce((sum, expense) => sum + parseMoney(expense.amount), 0);
      const formattedDate = new Date(`${currentDate}T00:00:00.000Z`);

      rows.push({
        date: currentDate,
        dayLabel: new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }).format(formattedDate),
        newPatients: dayPatients.length,
        totalVisits: dayAppointments.length,
        prescriptions: dayPrescriptions.length,
        followUpPending: dayFollowUps.length,
        revenueGenerated,
        expenses,
        net: revenueGenerated - expenses,
      });
    }

    return rows.reverse();
  }

  private buildPatientRow(params: {
    patient: Patient;
    patientCode: string;
    appointments: Appointment[];
    prescriptions: Prescription[];
    followUps: FollowUp[];
    doctorNameById: Map<string, string>;
  }): ReportPatientRow {
    const patientAppointments = params.appointments.filter((appointment) => appointment.patientId === params.patient.id);
    const patientPrescriptions = params.prescriptions.filter((prescription) => prescription.patientId === params.patient.id);
    const patientFollowUps = params.followUps
      .filter((followUp) => followUp.patientId === params.patient.id)
      .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());

    return {
      patientId: params.patient.id,
      patientCode: params.patientCode,
      patientName: params.patient.name,
      age: params.patient.age,
      gender: params.patient.gender,
      doctorId: params.patient.primaryDoctorId,
      doctorName:
        (params.patient.primaryDoctorId ? params.doctorNameById.get(params.patient.primaryDoctorId) : null) ??
        'Unassigned',
      phone: params.patient.phone,
      registeredDate: formatDateOnly(params.patient.createdAt),
      lastVisit: params.patient.lastVisitAt ? formatDateOnly(params.patient.lastVisitAt) : null,
      totalVisits: patientAppointments.length,
      prescriptionCount: patientPrescriptions.length,
      followUpDate: patientFollowUps[0] ? formatDateOnly(patientFollowUps[0].scheduledAt) : null,
      billingAmount: patientAppointments.reduce(
        (sum, appointment) => sum + parseMoney(appointment.billingAmount),
        0,
      ),
      status: params.patient.verificationStatus,
    };
  }

  private async buildPatientHistory(params: {
    patient: Patient;
    patientCode: string;
    doctorNameById: Map<string, string>;
    activeDoctorIds: string[];
  }): Promise<ReportPatientHistory> {
    const [appointments, prescriptions, uploadedReports] = await Promise.all([
      this.appointmentRepository.find({
        where: {
          patientId: params.patient.id,
          doctorId: In(params.activeDoctorIds),
        },
        relations: {
          doctor: true,
        },
        order: {
          appointmentDate: 'DESC',
          appointmentTime: 'DESC',
        },
      }),
      this.prescriptionRepository.find({
        where: {
          patientId: params.patient.id,
          doctorId: In(params.activeDoctorIds),
        },
        relations: {
          doctor: true,
          medicines: true,
        },
        order: {
          prescriptionDate: 'DESC',
          createdAt: 'DESC',
        },
      }),
      this.patientDocumentRepository.find({
        where: {
          patientId: params.patient.id,
        },
        order: {
          createdAt: 'DESC',
        },
      }),
    ]);

    const appointmentHistory: ReportPatientHistoryAppointment[] = appointments.map((appointment) => ({
      appointmentId: appointment.id,
      date: appointment.appointmentDate,
      time: appointment.appointmentTime,
      doctorName: appointment.doctor?.name ?? params.doctorNameById.get(appointment.doctorId) ?? 'Unassigned',
      appointmentType: appointment.appointmentType,
      status: this.titleCaseLabel(appointment.status),
      billingAmount: this.formatCurrency(parseMoney(appointment.billingAmount)),
      notes: appointment.notes,
    }));
    const prescriptionHistory: ReportPatientHistoryPrescription[] = prescriptions.map((prescription) => ({
      prescriptionId: prescription.id,
      date: prescription.prescriptionDate,
      doctorName: prescription.doctor?.name ?? params.doctorNameById.get(prescription.doctorId) ?? 'Unassigned',
      diagnosis: prescription.diagnosis,
      notes: prescription.notes,
      medicines: prescription.medicines.map((medicine) =>
        [medicine.medicineName, medicine.dosage, medicine.instruction].filter(Boolean).join(' - '),
      ),
    }));
    const documents: ReportPatientHistoryDocument[] = uploadedReports.map((document) => ({
      documentId: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      fileUrl: document.fileUrl,
      uploadedAt: document.createdAt.toISOString(),
    }));
    const doctorNotes: ReportPatientHistoryNote[] = [
      ...appointments
        .filter((appointment) => appointment.notes?.trim())
        .map((appointment) => ({
          source: 'Appointment',
          date: appointment.appointmentDate,
          note: appointment.notes!.trim(),
        })),
      ...prescriptions
        .filter((prescription) => prescription.notes?.trim())
        .map((prescription) => ({
          source: 'Prescription',
          date: prescription.prescriptionDate,
          note: prescription.notes!.trim(),
        })),
      ...(params.patient.notes?.trim()
        ? [
            {
              source: 'Patient Profile',
              date: formatDateOnly(params.patient.updatedAt),
              note: params.patient.notes.trim(),
            },
          ]
        : []),
    ].sort((left, right) => right.date.localeCompare(left.date));

    return {
      basicDetails: {
        patientId: params.patient.id,
        patientCode: params.patientCode,
        patientName: params.patient.name,
        age: params.patient.age,
        gender: params.patient.gender,
        phone: params.patient.phone,
        email: params.patient.email,
        bloodGroup: params.patient.bloodGroup,
        verificationStatus: this.titleCaseLabel(params.patient.verificationStatus),
        assignedDoctor:
          (params.patient.primaryDoctor?.name ??
            (params.patient.primaryDoctorId
              ? params.doctorNameById.get(params.patient.primaryDoctorId)
              : null)) ?? 'Unassigned',
        registrationDate: formatDateOnly(params.patient.createdAt),
        totalVisits: appointments.length,
      },
      medicalHistory: {
        allergies: params.patient.allergies,
        chronicDiseases: params.patient.chronicDiseases,
        pastSurgeries: params.patient.pastSurgeries,
        previousTreatments: params.patient.previousTreatments,
        additionalNotes: params.patient.notes,
        weight: params.patient.weight,
        height: params.patient.height,
        bp: params.patient.bp,
        sugar: params.patient.sugar,
        healthProblem: params.patient.healthProblem,
      },
      appointmentHistory,
      prescriptionHistory,
      uploadedReports: documents,
      doctorNotes,
    };
  }

  private formatCurrency(value: number): string {
    return `Rs. ${Math.round(value).toLocaleString('en-IN')}`;
  }

  private replaceFileExtension(fileName: string, nextExtension: string): string {
    return fileName.replace(/\.[^.]+$/, `.${nextExtension}`);
  }

  private formatSequenceCode(prefix: string, value: number): string {
    return `${prefix}${String(value).padStart(3, '0')}`;
  }

  private escapeCsv(value: string): string {
    const normalized = String(value ?? '').replace(/"/g, '""');
    return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getWorksheetName(title: string): string {
    const sanitized = title.replace(/[:\\/?*\[\]]/g, ' ').trim();
    return sanitized.slice(0, 31) || 'Report';
  }

  private renderPatientHistoryHtml(history: ReportPatientHistory): string {
    const basicDetailsRows = [
      ['Patient ID', history.basicDetails.patientCode],
      ['Patient Name', history.basicDetails.patientName],
      ['Age / Gender', `${history.basicDetails.age} / ${history.basicDetails.gender ?? 'NA'}`],
      ['Assigned Doctor', history.basicDetails.assignedDoctor],
      ['Mobile', history.basicDetails.phone],
      ['Email', history.basicDetails.email ?? '--'],
      ['Blood Group', history.basicDetails.bloodGroup ?? '--'],
      ['Registration Date', history.basicDetails.registrationDate],
      ['Total Visits', String(history.basicDetails.totalVisits)],
      ['Status', history.basicDetails.verificationStatus],
    ]
      .map(
        ([label, value]) =>
          `<tr><td><strong>${this.escapeHtml(label)}</strong></td><td>${this.escapeHtml(value)}</td></tr>`,
      )
      .join('');
    const medicalHistoryRows = [
      ['Allergies', history.medicalHistory.allergies ?? '--'],
      ['Chronic Diseases', history.medicalHistory.chronicDiseases ?? '--'],
      ['Past Surgeries', history.medicalHistory.pastSurgeries ?? '--'],
      ['Previous Treatments', history.medicalHistory.previousTreatments ?? '--'],
      ['Health Problem', history.medicalHistory.healthProblem ?? '--'],
      ['Weight', history.medicalHistory.weight ?? '--'],
      ['Height', history.medicalHistory.height ?? '--'],
      ['BP', history.medicalHistory.bp ?? '--'],
      ['Sugar', history.medicalHistory.sugar ?? '--'],
      ['Additional Notes', history.medicalHistory.additionalNotes ?? '--'],
    ]
      .map(
        ([label, value]) =>
          `<tr><td><strong>${this.escapeHtml(label)}</strong></td><td>${this.escapeHtml(value)}</td></tr>`,
      )
      .join('');
    const appointmentRows =
      history.appointmentHistory
        .map(
          (item) => `
            <tr>
              <td>${this.escapeHtml(item.date)}</td>
              <td>${this.escapeHtml(item.time)}</td>
              <td>${this.escapeHtml(item.doctorName)}</td>
              <td>${this.escapeHtml(item.appointmentType)}</td>
              <td>${this.escapeHtml(item.status)}</td>
              <td>${this.escapeHtml(item.billingAmount)}</td>
              <td>${this.escapeHtml(item.notes ?? '--')}</td>
            </tr>`,
        )
        .join('') || '<tr><td colspan="7">No appointment history found.</td></tr>';
    const prescriptionRows =
      history.prescriptionHistory
        .map(
          (item) => `
            <tr>
              <td>${this.escapeHtml(item.date)}</td>
              <td>${this.escapeHtml(item.doctorName)}</td>
              <td>${this.escapeHtml(item.diagnosis)}</td>
              <td>${this.escapeHtml(item.medicines.join(', ') || '--')}</td>
              <td>${this.escapeHtml(item.notes ?? '--')}</td>
            </tr>`,
        )
        .join('') || '<tr><td colspan="5">No prescription history found.</td></tr>';
    const reportRows =
      history.uploadedReports
        .map(
          (item) => `
            <tr>
              <td>${this.escapeHtml(item.fileName)}</td>
              <td>${this.escapeHtml(item.fileType)}</td>
              <td>${this.escapeHtml(item.uploadedAt)}</td>
              <td>${this.escapeHtml(item.fileUrl)}</td>
            </tr>`,
        )
        .join('') || '<tr><td colspan="4">No uploaded reports found.</td></tr>';
    const noteRows =
      history.doctorNotes
        .map(
          (item) => `
            <tr>
              <td>${this.escapeHtml(item.date)}</td>
              <td>${this.escapeHtml(item.source)}</td>
              <td>${this.escapeHtml(item.note)}</td>
            </tr>`,
        )
        .join('') || '<tr><td colspan="3">No doctor notes found.</td></tr>';

    return `
      <div class="section-title">Patient History</div>
      <table class="meta">
        ${basicDetailsRows}
      </table>
      <div class="section-title">Medical History</div>
      <table class="meta">
        ${medicalHistoryRows}
      </table>
      <div class="section-title">Appointment History</div>
      <table class="report-table">
        <thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Type</th><th>Status</th><th>Billing Amount</th><th>Notes</th></tr></thead>
        <tbody>${appointmentRows}</tbody>
      </table>
      <div class="section-title">Prescription History</div>
      <table class="report-table">
        <thead><tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Medicines</th><th>Notes</th></tr></thead>
        <tbody>${prescriptionRows}</tbody>
      </table>
      <div class="section-title">Uploaded Reports / Files</div>
      <table class="report-table">
        <thead><tr><th>File Name</th><th>File Type</th><th>Uploaded At</th><th>File URL</th></tr></thead>
        <tbody>${reportRows}</tbody>
      </table>
      <div class="section-title">Doctor Notes</div>
      <table class="report-table">
        <thead><tr><th>Date</th><th>Source</th><th>Note</th></tr></thead>
        <tbody>${noteRows}</tbody>
      </table>
    `;
  }

  private titleCaseLabel(value: string): string {
    return value
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private browserExecutableCandidates(): string[] {
    return [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ].filter(Boolean) as string[];
  }

  private findBrowserExecutable(): string {
    return this.browserExecutableCandidates().find((candidate) => fs.existsSync(candidate)) ?? '';
  }
}
