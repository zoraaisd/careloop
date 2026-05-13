import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import {
  ExpenseActivity,
  ExpenseActivityType,
} from '../../../entities/expense-activity.entity';
import type { CreateExpenseEntryDto } from '../dto/create-expense-entry.dto';
import type { ExpenseResponse } from '../types/doctor.types';
import { parseMoney } from './doctor.utils';
import { DoctorAccessService } from './doctor-access.service';
import { IsNull } from 'typeorm';

export class ExpenseService {
  private readonly expenseRepository = AppDataSource.getRepository(ExpenseActivity);
  private readonly accessService = new DoctorAccessService();

  async getExpenses(currentDoctorId?: string): Promise<ExpenseResponse> {
    const accessState = await this.accessService.getAccessState(currentDoctorId);
    const clinicId = accessState.clinicId ?? null;

    const items = await this.expenseRepository.find({
      where: clinicId
        ? [{ clinicId }, { clinicId: IsNull() }]
        : {},
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
    currentDoctorId?: string,
  ): Promise<{ message: string; entryId: string }> {
    const accessState = await this.accessService.getAccessState(currentDoctorId);
    const entry = this.expenseRepository.create({
      title: payload.title.trim(),
      category: payload.category.trim(),
      amount: payload.amount.toFixed(2),
      date: payload.date,
      notes: payload.notes?.trim() ?? null,
      type: payload.type ?? ExpenseActivityType.EXPENSE,
      clinicId: accessState.clinicId ?? null,
      createdByDoctorId: currentDoctorId ?? null,
    });

    const savedEntry = await this.expenseRepository.save(entry);

    return {
      message: 'Expense entry created successfully',
      entryId: savedEntry.id,
    };
  }

  async deleteExpense(entryId: string, currentDoctorId?: string): Promise<{ message: string }> {
    const accessState = await this.accessService.getAccessState(currentDoctorId);
    const clinicId = accessState.clinicId ?? null;
    const entry = await this.expenseRepository.findOne({
      where: clinicId
        ? [{ id: entryId, clinicId }, { id: entryId, clinicId: IsNull() }]
        : { id: entryId },
    });

    if (!entry) {
      throw new AppError('Expense entry not found', 404);
    }

    await this.expenseRepository.remove(entry);
    return { message: 'Expense entry deleted successfully' };
  }
}
