import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { SupplierController } from '../controllers/supplier.controller';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const supplierRouter = Router();

supplierRouter.get('/dashboard', asyncHandler(SupplierController.getDashboard));
supplierRouter.get('/', asyncHandler(SupplierController.listSuppliers));
supplierRouter.post('/', asyncHandler(SupplierController.createSupplier));
supplierRouter.get('/purchase-orders', asyncHandler(SupplierController.listPurchaseOrders));
supplierRouter.post('/purchase-orders', asyncHandler(SupplierController.createPurchaseOrder));
supplierRouter.patch('/purchase-orders/:orderId/payment-status', asyncHandler(SupplierController.updatePurchaseOrderPaymentStatus));
supplierRouter.get('/invoices', asyncHandler(SupplierController.listInvoices));
supplierRouter.post('/invoices/:invoiceId/payments', asyncHandler(SupplierController.recordPayment));
supplierRouter.post('/import-products', upload.single('file'), asyncHandler(SupplierController.importProducts));
supplierRouter.get('/import-template', asyncHandler(SupplierController.getImportTemplate));

supplierRouter.get('/:supplierId', asyncHandler(SupplierController.getSupplier));
supplierRouter.patch('/:supplierId', asyncHandler(SupplierController.updateSupplier));
supplierRouter.patch('/:supplierId/deactivate', asyncHandler(SupplierController.deactivateSupplier));
supplierRouter.delete('/:supplierId', asyncHandler(SupplierController.deleteSupplier));

export { supplierRouter };
