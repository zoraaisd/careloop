import type { Request, Response } from 'express';

import type { CreateDoctorDto } from '../dto/create-doctor.dto';
import { DoctorManagementService } from '../services/doctor-management.service';

const doctorManagementService = new DoctorManagementService();
const readDoctorId = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? '' : value ?? '';

export class DoctorManagementController {
  static async listDoctors(req: Request, res: Response): Promise<void> {
    const doctors = await doctorManagementService.listDoctors((req as any).user?.userId);
    res.status(200).json(doctors);
  }

  static async getDoctorDetails(req: Request, res: Response): Promise<void> {
    const doctor = await doctorManagementService.getDoctorDetails(readDoctorId(req.params.doctorId), (req as any).user?.userId);
    res.status(200).json(doctor);
  }

  static async updateDoctor(req: Request, res: Response): Promise<void> {
    const result = await doctorManagementService.updateDoctor(
      readDoctorId(req.params.doctorId),
      req.body,
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }

  static async updateClinicAssets(req: Request, res: Response): Promise<void> {
    const result = await doctorManagementService.updateClinicAssets(
      req.body as {
        assetType: 'image' | 'video';
        dataUrl: string;
        fileName: string;
      },
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }

  static async updateClinicOverview(req: Request, res: Response): Promise<void> {
    const result = await doctorManagementService.updateClinicOverview(
      req.body as {
        clinicName: string;
        clinicPhone: string;
        clinicAddress: string;
        city?: string;
      },
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }

  static async deleteClinicAsset(req: Request, res: Response): Promise<void> {
    const assetType = readDoctorId(req.params.assetType);

    if (assetType !== 'image' && assetType !== 'video') {
      res.status(400).json({ message: 'Invalid clinic asset type' });
      return;
    }

    const result = await doctorManagementService.deleteClinicAsset(assetType, (req as any).user?.userId);
    res.status(200).json(result);
  }

  static async createDoctor(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateDoctorDto;
    const result = await doctorManagementService.createDoctor(payload, (req as any).user?.userId);
    res.status(201).json(result);
  }

  static async requestInvitationOtp(req: Request, res: Response): Promise<void> {
    const result = await doctorManagementService.requestInvitationOtp(req.body, (req as any).user?.userId);
    res.status(200).json(result);
  }

  static async verifyInvitationOtp(req: Request, res: Response): Promise<void> {
    const result = await doctorManagementService.verifyInvitationOtp(req.body, (req as any).user?.userId);
    res.status(200).json(result);
  }
}

