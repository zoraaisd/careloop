import type { Request, Response } from 'express';

import { ExpenseService } from '../services/expense.service';

const expenseService = new ExpenseService();

export class ExpenseController {
  static async getExpenses(_req: Request, res: Response): Promise<void> {
    const result = await expenseService.getExpenses();
    res.status(200).json(result);
  }

  static async createExpense(req: Request, res: Response): Promise<void> {
    const result = await expenseService.createExpense(req.body);
    res.status(201).json(result);
  }

  static async deleteExpense(req: Request, res: Response): Promise<void> {
    const entryId = String(req.params.entryId);
    const result = await expenseService.deleteExpense(entryId);
    res.status(200).json(result);
  }
}
