import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { validateRequest } from '../../../common/utils/validate-request';
import { InventoryController } from '../controllers/inventory.controller';
import { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';

const inventoryRouter = Router();

inventoryRouter.get('/', asyncHandler(InventoryController.getInventory));
inventoryRouter.post(
  '/',
  asyncHandler(async (req, _res, next) => {
    await validateRequest(CreateInventoryItemDto, req.body);
    next();
  }),
  asyncHandler(InventoryController.createInventoryItem),
);
inventoryRouter.delete(
  '/:itemId',
  asyncHandler(InventoryController.deleteInventoryItem),
);
inventoryRouter.patch(
  '/:itemId/restock',
  asyncHandler(InventoryController.restockInventoryItem),
);

export { inventoryRouter };
