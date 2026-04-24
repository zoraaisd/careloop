import type { NextFunction, Request, Response } from 'express';

import { DoctorAccessService } from '../services/doctor-access.service';

const doctorAccessService = new DoctorAccessService();

export const enforceDoctorPortalAccess = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  await doctorAccessService.ensureDoctorPortalAccess((req as any).user?.userId);
  next();
};
