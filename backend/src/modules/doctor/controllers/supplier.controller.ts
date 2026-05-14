import type { Request, Response } from 'express';

import { supplierService } from '../services/supplier.service';

export class SupplierController {
  static async getDashboard(req: Request, res: Response): Promise<void> {
    res.status(200).json(await supplierService.getDashboard((req as any).user?.userId));
  }

  static async listSuppliers(req: Request, res: Response): Promise<void> {
    res.status(200).json(await supplierService.listSuppliers((req as any).user?.userId, req.query as any));
  }

  static async createSupplier(req: Request, res: Response): Promise<void> {
    res.status(201).json(await supplierService.createSupplier((req as any).user?.userId, req.body));
  }

  static async getSupplier(req: Request, res: Response): Promise<void> {
    res.status(200).json(await supplierService.getSupplier((req as any).user?.userId, String(req.params.supplierId)));
  }

  static async updateSupplier(req: Request, res: Response): Promise<void> {
    res.status(200).json(await supplierService.updateSupplier((req as any).user?.userId, String(req.params.supplierId), req.body));
  }

  static async deleteSupplier(req: Request, res: Response): Promise<void> {
    res.status(200).json(await supplierService.deleteSupplier((req as any).user?.userId, String(req.params.supplierId)));
  }

  static async deactivateSupplier(req: Request, res: Response): Promise<void> {
    res.status(200).json(await supplierService.updateSupplier((req as any).user?.userId, String(req.params.supplierId), { status: 'Inactive' }));
  }

  static async listPurchaseOrders(req: Request, res: Response): Promise<void> {
    res.status(200).json(await supplierService.listPurchaseOrders((req as any).user?.userId));
  }

  static async createPurchaseOrder(req: Request, res: Response): Promise<void> {
    res.status(201).json(await supplierService.createPurchaseOrder((req as any).user?.userId, req.body));
  }

  static async updatePurchaseOrderPaymentStatus(req: Request, res: Response): Promise<void> {
    res.status(200).json(
      await supplierService.updatePurchaseOrderPaymentStatus(
        (req as any).user?.userId,
        String(req.params.orderId),
        String(req.body.paymentStatus),
      ),
    );
  }

  static async listInvoices(req: Request, res: Response): Promise<void> {
    res.status(200).json(await supplierService.listInvoices((req as any).user?.userId));
  }

  static async recordPayment(req: Request, res: Response): Promise<void> {
    res.status(200).json(await supplierService.recordPayment((req as any).user?.userId, String(req.params.invoiceId), Number(req.body.amount)));
  }

  static async importProducts(req: Request, res: Response): Promise<void> {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const result = await supplierService.importProducts((req as any).user?.userId, file.buffer, String(req.body.supplierId));
    res.status(200).json(result);
  }

  static async getImportTemplate(_req: Request, res: Response): Promise<void> {
    const buffer = await supplierService.getImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_import_template.xlsx');
    res.send(buffer);
  }
}
