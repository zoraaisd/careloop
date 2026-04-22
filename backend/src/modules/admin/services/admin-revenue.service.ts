import { adminStoreService } from './admin-store.service';
import type { RevenueStatisticsResponse } from '../types/admin.types';

class AdminRevenueService {
  getRevenueStatistics(): RevenueStatisticsResponse {
    return adminStoreService.getRevenue();
  }
}

export const adminRevenueService = new AdminRevenueService();
