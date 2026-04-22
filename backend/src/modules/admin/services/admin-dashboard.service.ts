import { adminStoreService } from './admin-store.service';
import type { AdminDashboardResponse } from '../types/admin.types';

class AdminDashboardService {
  getDashboard(): AdminDashboardResponse {
    return adminStoreService.getDashboard();
  }
}

export const adminDashboardService = new AdminDashboardService();
