import type { Request, Response } from 'express';

import { ExpenseService } from '../services/expense.service';

const expenseService = new ExpenseService();

export class ExpenseController {
  static async getExpenses(req: Request, res: Response): Promise<void> {
    const result = await expenseService.getExpenses((req as any).user?.userId);
    res.status(200).json(result);
  }

  static async createExpense(req: Request, res: Response): Promise<void> {
    const result = await expenseService.createExpense(req.body, (req as any).user?.userId);
    res.status(201).json(result);
  }

  static async deleteExpense(req: Request, res: Response): Promise<void> {
    const entryId = String(req.params.entryId);
    const result = await expenseService.deleteExpense(entryId, (req as any).user?.userId);
    res.status(200).json(result);
  }
}
