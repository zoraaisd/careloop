import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import {
  ExpenseActivity,
  ExpenseActivityType,
} from '../../../entities/expense-activity.entity';
import type { CreateExpenseEntryDto } from '../dto/create-expense-entry.dto';
import type { ExpenseResponse } from '../types/doctor.types';
import { parseMoney } from './doctor.utils';

export class ExpenseService {
  private readonly expenseRepository = AppDataSource.getRepository(ExpenseActivity);

  async getExpenses(): Promise<ExpenseResponse> {
    const items = await this.expenseRepository.find({
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    const totalSpend = items.reduce((sum, item) => sum + parseMoney(item.amount), 0);

    return {
      summary: {
        entriesCount: items.length,
        totalSpend,
        averageSpend: items.length === 0 ? 0 : totalSpend / items.length,
        categoriesCount: new Set(items.map((item) => item.category)).size,
      },
      items: items.map((item) => ({
        entryId: item.id,
        title: item.title,
        category: item.category,
        amount: parseMoney(item.amount),
        date: item.date,
        notes: item.notes,
        type: item.type,
      })),
    };
  }

  async createExpense(
    payload: CreateExpenseEntryDto,
  ): Promise<{ message: string; entryId: string }> {
    const entry = this.expenseRepository.create({
      title: payload.title.trim(),
      category: payload.category.trim(),
      amount: payload.amount.toFixed(2),
      date: payload.date,
      notes: payload.notes?.trim() ?? null,
      type: payload.type ?? ExpenseActivityType.EXPENSE,
    });

    const savedEntry = await this.expenseRepository.save(entry);

    return {
      message: 'Expense entry created successfully',
      entryId: savedEntry.id,
    };
  }

  async deleteExpense(entryId: string): Promise<{ message: string }> {
    const entry = await this.expenseRepository.findOne({ where: { id: entryId } });

    if (!entry) {
      throw new AppError('Expense entry not found', 404);
    }

    await this.expenseRepository.remove(entry);
    return { message: 'Expense entry deleted successfully' };
  }
}
