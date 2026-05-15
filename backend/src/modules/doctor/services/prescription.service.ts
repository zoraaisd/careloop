import { AppDataSource } from '../../../config/data-source';
import { ChatMessageType, ChatSenderType } from '../../../entities/chat-message.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { PrescriptionMedicine } from '../../../entities/prescription-medicine.entity';
import { InventoryItem } from '../../../entities/inventory-item.entity';
import { In } from 'typeorm';
import type { CreatePrescriptionDto } from '../dto/create-prescription.dto';
import type { PrescriptionListResponse } from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { DoctorSupportService } from './doctor-support.service';
import { formatDate, formatDateOnly } from './doctor.utils';
import { ExpenseService } from './expense.service';
import { ExpenseActivityType } from '../../../entities/expense-activity.entity';
import { FileStorageService } from '../../files/services/file-storage.service';
import fs from 'node:fs';
import { sendWhatsApp } from '../../whatsapp-healthcare/bot/whatsapp-integration';

export class PrescriptionService {
  private readonly prescriptionRepository = AppDataSource.getRepository(Prescription);
  private readonly medicineRepository = AppDataSource.getRepository(PrescriptionMedicine);
  private readonly inventoryRepository = AppDataSource.getRepository(InventoryItem);
  private readonly supportService = new DoctorSupportService();
  private readonly accessService = new DoctorAccessService();
  private readonly fileStorageService = new FileStorageService();

  private extractUploadedFileId(fileUrl?: string | null): string | null {
    if (!fileUrl) {
      return null;
    }

    const match = fileUrl.match(/\/files\/([0-9a-fA-F-]{36})$/);
    return match?.[1] ?? null;
  }

  async listPrescriptions(currentDoctorId?: string): Promise<PrescriptionListResponse> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const clinicDoctorIds = await this.accessService.getClinicDoctorIds(doctorId);
    const prescriptions = await this.prescriptionRepository.find({
      where: { doctorId: In(clinicDoctorIds) },
      relations: { patient: true, doctor: true, medicines: true },
      order: { prescriptionDate: 'DESC', createdAt: 'DESC' },
    });

    return {
      total: prescriptions.length,
      items: prescriptions.map((prescription) => ({
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        doctorId: prescription.doctorId,
        patientName: prescription.patient.name,
        doctorName: prescription.doctor.name,
        diagnosis: prescription.diagnosis,
        medicines: prescription.medicines.map((medicine) => ({
          medicineName: medicine.medicineName,
          dosage: medicine.dosage,
          instruction: medicine.instruction,
        })),
        medicinesSummary: prescription.medicines
          .map((medicine) => `${medicine.medicineName} ${medicine.dosage}`)
          .join(', '),
        instructionsSummary: prescription.medicines
          .map((medicine) => `${medicine.medicineName}: ${medicine.instruction}`)
          .join('; '),
        notes: prescription.notes,
        prescriptionDate: formatDateOnly(prescription.prescriptionDate),
        pdfUrl: prescription.pdfUrl,
        sentAt: formatDate(prescription.sentAt),
        resendCount: prescription.resendCount,
      })),
    };
  }

  async createPrescription(
    payload: CreatePrescriptionDto,
    currentDoctorId?: string,
  ): Promise<{ message: string; prescriptionId: string }> {
    const doctor = await this.accessService.ensureManagedDoctor(
      payload.doctorId,
      currentDoctorId,
    );
    const patient = await this.accessService.ensureOwnedPatient(
      payload.patientId,
      currentDoctorId,
    );

    const accessState = await this.accessService.getAccessState(currentDoctorId);
    const clinicId = accessState.clinicId;

    const prescription = this.prescriptionRepository.create({
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      diagnosis: payload.diagnosis.trim(),
      notes: payload.notes?.trim() ?? null,
      prescriptionDate: payload.prescriptionDate ?? new Date().toISOString().slice(0, 10),
      pdfUrl: null,
      sentAt: new Date(),
      medicines: payload.medicines.map((medicine) =>
        this.medicineRepository.create({
          medicineName: medicine.medicineName.trim(),
          dosage: medicine.dosage.trim(),
          instruction: medicine.instruction.trim(),
          quantity: medicine.quantity,
        }),
      ),
    });

    // Reduce Inventory logic
    for (const med of payload.medicines) {
      const inventoryItem = await this.inventoryRepository.findOne({
        where: {
          itemName: med.medicineName.trim(),
          clinicId: clinicId || undefined,
        },
      });

      if (inventoryItem) {
        const sellingPrice = Number(inventoryItem.sellingPrice) || 0;
        const totalAmount = sellingPrice * med.quantity;

        inventoryItem.quantity = Math.max(0, inventoryItem.quantity - med.quantity);
        await this.inventoryRepository.save(inventoryItem);

        if (totalAmount > 0) {
          try {
            const expenseService = new ExpenseService();
            await expenseService.createExpense({
              title: `Prescription Sale: ${med.medicineName.trim()}`,
              category: 'Sales',
              amount: totalAmount,
              date: new Date().toISOString().split('T')[0],
              notes: `Prescribed ${med.quantity} units at ₹${sellingPrice.toFixed(2)} each to ${patient.name}`,
              type: ExpenseActivityType.EXPENSE,
            }, currentDoctorId);
          } catch (e) {
            console.error('Failed to log expense for prescription sale:', e);
          }
        }
      }
    }

    const savedPrescription = await this.prescriptionRepository.save(prescription);

    if (payload.pdfUrl?.trim()) {
      const normalizedPdfUrl = payload.pdfUrl.trim();

      if (/^data:application\/pdf;base64,/i.test(normalizedPdfUrl)) {
        const storedFile = await this.fileStorageService.saveDataUrl({
          fileName: `prescription_${savedPrescription.id}.pdf`,
          dataUrl: normalizedPdfUrl,
        });

        savedPrescription.pdfUrl = this.fileStorageService.buildFileUrl(storedFile.id);
        await this.prescriptionRepository.save(savedPrescription);
      } else if (normalizedPdfUrl.startsWith('/api/files/')) {
        savedPrescription.pdfUrl = normalizedPdfUrl;
        await this.prescriptionRepository.save(savedPrescription);
      }
    }

    const chat = await this.supportService.ensureChatForPatient(patient.id, payload.doctorId);
    const medicinesText = payload.medicines
      .map(
        (medicine) =>
          `${medicine.medicineName} ${medicine.dosage} (${medicine.instruction})`,
      )
      .join(', ');

    await this.supportService.appendChatMessage({
      chatId: chat.id,
      senderType: ChatSenderType.SYSTEM,
      messageType: ChatMessageType.PRESCRIPTION,
      content: `New prescription from ${doctor.name}. Diagnosis: ${payload.diagnosis}. ${medicinesText}.`,
      attachmentUrl: payload.pdfUrl ?? null,
      direction: 'outbound',
    });

    await this.supportService.logActivity({
      doctorId: doctor.id,
      patientId: payload.patientId,
      type: 'prescription-sent',
      message: `Prescription sent to ${patient.name} by ${doctor.name}.`,
    });

    return {
      message: 'Prescription created successfully',
      prescriptionId: savedPrescription.id,
    };
  }

  async resendPrescription(
    prescriptionId: string,
    currentDoctorId?: string,
  ): Promise<{ message: string }> {
    const prescription = await this.accessService.ensureOwnedPrescription(
      prescriptionId,
      currentDoctorId,
    );

    prescription.resendCount += 1;
    prescription.sentAt = new Date();
    await this.prescriptionRepository.save(prescription);

    const chat = await this.supportService.ensureChatForPatient(
      prescription.patientId,
      prescription.doctorId,
    );
    await this.supportService.appendChatMessage({
      chatId: chat.id,
      senderType: ChatSenderType.SYSTEM,
      messageType: ChatMessageType.PRESCRIPTION,
      content: `Prescription resent for ${prescription.patient.name}.`,
      attachmentUrl: prescription.pdfUrl,
      direction: 'outbound',
    });
    await this.supportService.logActivity({
      doctorId: prescription.doctorId,
      patientId: prescription.patientId,
      type: 'whatsapp-message',
      message: `Prescription resent to ${prescription.patient.name}.`,
    });

    return { message: 'Prescription resent successfully' };
  }

  async getPatientPrescriptions(
    patientId: string,
    currentDoctorId?: string,
  ): Promise<PrescriptionListResponse> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    await this.accessService.ensureOwnedPatient(patientId, doctorId);

    const prescriptions = await this.prescriptionRepository.find({
      where: { patientId },
      relations: { patient: true, doctor: true, medicines: true },
      order: { prescriptionDate: 'DESC', createdAt: 'DESC' },
    });

    return {
      total: prescriptions.length,
      items: prescriptions.map((prescription) => ({
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        doctorId: prescription.doctorId,
        patientName: prescription.patient.name,
        doctorName: prescription.doctor.name,
        diagnosis: prescription.diagnosis,
        medicines: prescription.medicines.map((medicine) => ({
          medicineName: medicine.medicineName,
          dosage: medicine.dosage,
          instruction: medicine.instruction,
        })),
        medicinesSummary: prescription.medicines
          .map((medicine) => `${medicine.medicineName} ${medicine.dosage}`)
          .join(', '),
        instructionsSummary: prescription.medicines
          .map((medicine) => `${medicine.medicineName}: ${medicine.instruction}`)
          .join('; '),
        notes: prescription.notes,
        prescriptionDate: formatDateOnly(prescription.prescriptionDate),
        pdfUrl: prescription.pdfUrl,
        sentAt: formatDate(prescription.sentAt),
        resendCount: prescription.resendCount,
      })),
    };
  }

  async sendPrescriptionPdf(
    prescriptionId: string,
    currentDoctorId?: string,
  ): Promise<{ message: string; pdfUrl: string }> {
    console.log(`Sending prescription PDF for ID: ${prescriptionId}`);
    try {
      const prescription = await this.prescriptionRepository.findOne({
        where: { id: prescriptionId },
        relations: { patient: true, doctor: true, medicines: true },
      });

      if (!prescription) {
        console.error('Prescription not found');
        throw new Error('Prescription not found');
      }

      console.log('Generating PDF buffer...');
      // 1. Generate PDF in memory only
      const pdfBuffer = await this.generatePrescriptionPdf(prescription);
      console.log(`PDF buffer generated successfully. Size: ${pdfBuffer.byteLength}`);

      const previousFileId = this.extractUploadedFileId(prescription.pdfUrl);
      if (previousFileId) {
        await this.fileStorageService.deleteFile(previousFileId);
      }

      const storedFile = await this.fileStorageService.saveBuffer({
        fileName: `prescription_${prescription.id}.pdf`,
        mimeType: 'application/pdf',
        fileSize: pdfBuffer.length,
        buffer: pdfBuffer,
      });
      const pdfUrl = this.fileStorageService.buildFileUrl(storedFile.id);
      console.log('Stored prescription PDF in database');

      // 2. Update Prescription metadata with DB-backed file URL
      prescription.pdfUrl = pdfUrl;
      prescription.sentAt = new Date();
      prescription.resendCount += 1;
      await this.prescriptionRepository.save(prescription);

      // 3. Send via WhatsApp without attachment storage
      const message = `Hi ${prescription.patient.name}, your prescription for "${prescription.diagnosis}" from Dr. ${prescription.doctor.name} is ready. Please contact the clinic if you need the PDF shared directly.`;
      console.log(`Sending WhatsApp to: ${prescription.patient.phone}`);
      await sendWhatsApp(prescription.patient.phone, message);
      console.log('WhatsApp message sent successfully');

      // 4. Log Activity
      await this.supportService.logActivity({
        doctorId: prescription.doctorId,
        patientId: prescription.patientId,
        type: 'prescription-sent',
        message: `Prescription notification sent to ${prescription.patient.name} without storing PDF on server.`,
      });

      return { message: 'Prescription PDF prepared successfully', pdfUrl };
    } catch (error: any) {
      console.error('FAILED to send prescription PDF:', error);
      throw error;
    }
  }

  private async generatePrescriptionPdf(prescription: Prescription): Promise<Buffer> {
    console.log('Initializing Puppeteer...');
    const puppeteer = require('puppeteer-core');
    const executablePath = this.findBrowserExecutable();
    console.log(`Browser executable path: ${executablePath}`);

    if (!executablePath) {
      throw new Error('PDF generation unavailable: No browser found.');
    }

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      console.log('Rendering prescription HTML...');
      const page = await browser.newPage();
      const html = this.renderPrescriptionHtml(prescription);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      console.log('Generating PDF from page content...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });

      return Buffer.from(pdfBuffer);
    } catch (err) {
      console.error('Error during Puppeteer PDF generation:', err);
      throw err;
    } finally {
      if (browser) await browser.close();
    }
  }

  private renderPrescriptionHtml(prescription: Prescription): string {
    const medicinesHtml = prescription.medicines
      .map(
        (m) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
          <div style="font-weight: bold; color: #142e26;">${m.medicineName}</div>
          <div style="font-size: 11px; color: #607d74; margin-top: 2px;">${m.instruction}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: center; color: #1faa62; font-weight: bold;">${m.dosage}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">${m.quantity} Units</td>
      </tr>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1faa62; padding-bottom: 20px; margin-bottom: 30px; }
          .doctor-info h1 { margin: 0; color: #142e26; font-size: 24px; }
          .doctor-info p { margin: 4px 0; color: #607d74; font-size: 14px; }
          .patient-info { background: #f8fbf9; padding: 20px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; }
          .patient-info div span { display: block; font-size: 10px; text-transform: uppercase; color: #1faa62; font-weight: bold; margin-bottom: 4px; }
          .patient-info div strong { font-size: 16px; color: #142e26; }
          .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #607d74; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .diagnosis { font-size: 18px; font-weight: bold; color: #142e26; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { text-align: left; background: #f8fbf9; padding: 12px; font-size: 10px; text-transform: uppercase; color: #607d74; }
          .notes { font-style: italic; color: #607d74; font-size: 13px; padding: 15px; background: #fafafa; border-radius: 8px; }
          .footer { margin-top: 50px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="doctor-info">
            <h1>Dr. ${prescription.doctor.name}</h1>
            <p>Registration No: MED-${prescription.doctor.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div style="text-align: right; color: #1faa62; font-weight: bold; font-size: 18px;">
            CareLoop Health
          </div>
        </div>

        <div class="patient-info">
          <div>
            <span>Patient Name</span>
            <strong>${prescription.patient.name}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>${prescription.prescriptionDate}</strong>
          </div>
          <div>
            <span>Patient ID</span>
            <strong>PID-${prescription.patientId.slice(0, 6).toUpperCase()}</strong>
          </div>
        </div>

        <div class="section-title">Clinical Diagnosis</div>
        <div class="diagnosis">${prescription.diagnosis}</div>

        <div class="section-title">Prescribed Medications</div>
        <table>
          <thead>
            <tr>
              <th>Medicine & Instructions</th>
              <th style="text-align: center;">Dosage</th>
              <th style="text-align: right;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${medicinesHtml}
          </tbody>
        </table>

        ${
          prescription.notes
            ? `
          <div class="section-title">Clinical Remarks</div>
          <div class="notes">${prescription.notes}</div>
        `
            : ''
        }

        <div class="footer">
          <p>This is a digitally verified prescription. For any queries, please contact our support.</p>
          <p>&copy; ${new Date().getFullYear()} CareLoop Healthcare Management System</p>
        </div>
      </body>
      </html>
    `;
  }

  private findBrowserExecutable(): string {
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return '';
  }
}
