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
import { Prescription } from '../../../entities/prescription.entity';
import { User, UserRole } from '../../../entities/user.entity';
import type {
  ReportDailyRow,
  ReportDoctorOption,
  ReportPatientRow,
  ReportResponse,
  ReportViewResponse,
  ReportViewRow,
} from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { addDays, formatDateOnly, parseMoney } from './doctor.utils';

type ReportType = 'patient' | 'revenue' | 'inventory' | 'expenses';
type ExportFormat = 'csv' | 'sheet' | 'pdf';

type ReportQueryParams = {
  dateFrom?: string;
  dateTo?: string;
  doctorId?: string;
  reportType?: ReportType;
};

type ReportDataset = {
  filters: ReportResponse['filters'];
  doctors: ReportDoctorOption[];
  summary: ReportResponse['summary'];
  daily: ReportDailyRow[];
  patients: ReportPatientRow[];
};

type ReportContext = {
  currentDoctorId: string;
  dateFrom: string;
  dateTo: string;
  scopedDoctorIds: string[];
  activeDoctorIds: string[];
  selectedDoctorId: string | null;
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

    if (selectedDoctorId && !scopedDoctorIds.includes(selectedDoctorId)) {
      throw new AppError('Selected doctor is outside your clinic scope', 403);
    }

    return {
      currentDoctorId: doctorId,
      dateFrom,
      dateTo,
      scopedDoctorIds,
      activeDoctorIds: selectedDoctorId ? [selectedDoctorId] : scopedDoctorIds,
      selectedDoctorId,
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

    const doctorNameById = new Map(
      context.doctorOptions.map((doctor) => [doctor.doctorId, doctor.doctorName]),
    );
    const newPatientsWithinRange = patients.filter((patient) => {
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
      patients,
      appointments,
      prescriptions,
      expenses,
      followUps: followUpsWithinRange,
    });
    const revenueGenerated = appointments.reduce(
      (sum, appointment) => sum + parseMoney(appointment.billingAmount),
      0,
    );
    const expenseTotal = expenses.reduce(
      (sum, expense) => sum + parseMoney(expense.amount),
      0,
    );
    const patientRows = patients
      .map((patient) =>
        this.buildPatientRow({
          patient,
          appointments,
          prescriptions,
          followUps,
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
      summary: {
        totalPatients: patients.length,
        newPatients: newPatientsWithinRange.length,
        totalVisits: appointments.length,
        prescriptions: prescriptions.length,
        followUpPending: followUpsWithinRange.length,
        revenueGenerated,
        expenses: expenseTotal,
        net: revenueGenerated - expenseTotal,
        averageBilling: appointments.length > 0 ? revenueGenerated / appointments.length : 0,
      },
      daily,
      patients: patientRows,
    };
  }

  private async buildPatientView(context: ReportContext): Promise<ReportViewResponse> {
    const report = await this.buildPatientDataset(
      {
        dateFrom: context.dateFrom,
        dateTo: context.dateTo,
        doctorId: context.selectedDoctorId ?? undefined,
      },
      context.currentDoctorId,
    );

    return {
      filters: {
        reportType: 'patient',
        dateFrom: context.dateFrom,
        dateTo: context.dateTo,
        doctorId: context.selectedDoctorId,
      },
      title: 'Patient Report',
      doctors: context.doctorOptions,
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
        { key: 'status', label: 'Status', kind: 'status' },
      ],
      rows: report.patients.map((patient, index) => ({
        patientId: this.formatSequenceCode('PAD', index + 1),
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

    const orderedAppointments = [...appointments].sort((left, right) => {
      const dateCompare = left.appointmentDate.localeCompare(right.appointmentDate);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      const timeCompare = left.appointmentTime.localeCompare(right.appointmentTime);

      if (timeCompare !== 0) {
        return timeCompare;
      }

      return left.patient.name.localeCompare(right.patient.name);
    });

    const totalRevenue = appointments.reduce(
      (sum, appointment) => sum + parseMoney(appointment.billingAmount),
      0,
    );
    const paidAmount = appointments
      .filter((appointment) => appointment.status === 'done')
      .reduce((sum, appointment) => sum + parseMoney(appointment.billingAmount), 0);
    const pendingAmount = totalRevenue - paidAmount;
    const daysCount = Math.max(1, new Set(appointments.map((item) => item.appointmentDate)).size);
    const doctorRevenue = appointments.reduce((map, appointment) => {
      map.set(
        appointment.doctor.name,
        (map.get(appointment.doctor.name) ?? 0) + parseMoney(appointment.billingAmount),
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
        { key: 'date', label: 'Date' },
        { key: 'patientName', label: 'Patient Name' },
        { key: 'doctorName', label: 'Doctor' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'consultationFee', label: 'Consultation Fee', align: 'right' },
        { key: 'totalAmount', label: 'Total Amount', align: 'right' },
        { key: 'paymentStatus', label: 'Payment Status', kind: 'status' },
      ],
      rows: orderedAppointments.map((appointment, index) => {
        const amount = parseMoney(appointment.billingAmount);
        return {
          invoiceId: this.formatSequenceCode('INV', index + 1),
          date: appointment.appointmentDate,
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          supplier: '--',
          consultationFee: this.formatCurrency(amount),
          totalAmount: this.formatCurrency(amount),
          paymentStatus: appointment.status === 'done' ? 'Paid' : 'Pending',
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
        { key: 'type', label: 'Type', kind: 'status' },
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
    worksheet.getRow(8).eachCell((cell) => {
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
    worksheet.getRow(detailsHeaderRowIndex).eachCell((cell) => {
      cell.fill = headerFill;
    });

    for (const row of view.rows) {
      worksheet.addRow(view.columns.map((column) => String(row[column.key] ?? '--')));
    }

    worksheet.eachRow((row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        cell.border = border;
      });
    });

    for (let columnIndex = 1; columnIndex <= maxColumnCount; columnIndex += 1) {
      const column = worksheet.getColumn(columnIndex);
      let maxLength = 16;

      column.eachCell({ includeEmpty: true }, (cell) => {
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
    return [
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
