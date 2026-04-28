import type { Request, Response } from 'express';
import { validateRequest } from '../../../common/utils/validate-request';
import { logger } from '../../../common/logger';
import { CreateAdminClinicDto } from '../dto/create-admin-clinic.dto';
import { UpdateClinicRequestStatusDto } from '../dto/update-clinic-request-status.dto';
import { adminClinicService } from '../services/admin-clinic.service';

const getParam = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] : value ?? '');

class AdminClinicController {
  async getClinics(_req: Request, res: Response): Promise<void> {
    res.status(200).json(await adminClinicService.getClinics());
  }

  async getClinicById(req: Request, res: Response): Promise<void> {
    res.status(200).json(await adminClinicService.getClinicById(getParam(req.params.clinicId)));
  }

  async createClinic(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(CreateAdminClinicDto, req.body);
    const clinic = adminClinicService.createClinic(payload);

    res.status(201).json({
      message: 'Clinic created successfully',
      clinic,
    });
  }

  deleteClinic(req: Request, res: Response): void {
    adminClinicService.deleteClinic(getParam(req.params.clinicId));
    res.status(200).json({
      message: 'Clinic deleted successfully',
    });
  }

  async getClinicRequests(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await adminClinicService.getClinicRequests());
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch admin clinic requests');
      res.status(200).json([]);
    }
  }

  async updateClinicRequestStatus(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(UpdateClinicRequestStatusDto, req.body);
    const clinicRequest = adminClinicService.updateClinicRequestStatus(getParam(req.params.requestId), payload);

    res.status(200).json({
      message: 'Clinic request status updated successfully',
      clinicRequest,
    });
  }
}

export const adminClinicController = new AdminClinicController();
