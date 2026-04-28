import type { Request, Response } from 'express';

import { DoctorApprovalStatus } from '../../../entities/user.entity';
import { adminDoctorService } from '../services/admin-doctor.service';

class AdminDoctorController {
  async getDoctorRequests(req: Request, res: Response): Promise<void> {
    const status =
      typeof req.query.status === 'string'
        ? (req.query.status as DoctorApprovalStatus)
        : undefined;

    const data = await adminDoctorService.getDoctorRequests(status);
    res.status(200).json(data);
  }

  async getDoctorById(req: Request, res: Response): Promise<void> {
    const doctorId = Array.isArray(req.params.doctorId) ? req.params.doctorId[0] : req.params.doctorId;
    const data = await adminDoctorService.getDoctorById(doctorId);
    res.status(200).json(data);
  }

  async approveDoctor(req: Request, res: Response): Promise<void> {
    const doctorId = Array.isArray(req.params.doctorId) ? req.params.doctorId[0] : req.params.doctorId;
    const result = await adminDoctorService.updateDoctorApprovalStatus(
      doctorId,
      DoctorApprovalStatus.APPROVED,
    );

    res.status(200).json(result);
  }

  async rejectDoctor(req: Request, res: Response): Promise<void> {
    const doctorId = Array.isArray(req.params.doctorId) ? req.params.doctorId[0] : req.params.doctorId;
    const result = await adminDoctorService.updateDoctorApprovalStatus(
      doctorId,
      DoctorApprovalStatus.REJECTED,
    );

    res.status(200).json(result);
  }

  async updateDoctor(req: Request, res: Response): Promise<void> {
    const doctorId = Array.isArray(req.params.doctorId) ? req.params.doctorId[0] : req.params.doctorId;
    await adminDoctorService.updateDoctor(doctorId, req.body);
    res.status(200).json({ success: true, message: 'Doctor updated successfully' });
  }

  async deleteDoctor(req: Request, res: Response): Promise<void> {
    const doctorId = Array.isArray(req.params.doctorId) ? req.params.doctorId[0] : req.params.doctorId;
    await adminDoctorService.deleteDoctor(doctorId);
    res.status(200).json({ success: true, message: 'Doctor removed successfully' });
  }
}

export const adminDoctorController = new AdminDoctorController();
