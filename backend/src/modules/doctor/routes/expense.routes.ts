import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { validateRequest } from '../../../common/utils/validate-request';
import { ExpenseController } from '../controllers/expense.controller';
import { CreateExpenseEntryDto } from '../dto/create-expense-entry.dto';

const expenseRouter = Router();

expenseRouter.get('/', asyncHandler(ExpenseController.getExpenses));
expenseRouter.post(
  '/',
  asyncHandler(async (req, _res, next) => {
    await validateRequest(CreateExpenseEntryDto, req.body);
    next();
  }),
  asyncHandler(ExpenseController.createExpense),
);
expenseRouter.delete(
  '/:entryId',
  asyncHandler(ExpenseController.deleteExpense),
);

export { expenseRouter };
