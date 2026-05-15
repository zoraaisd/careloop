import React, { useState, useEffect } from 'react';
import { Activity, Plus, Trash2, IndianRupee, PieChart, TrendingUp, AlertCircle } from 'lucide-react';
import api, { notifySuccess } from '@/services/api';
import { emitDashboardRefresh } from '@/services/dashboard-refresh';

type RecentActivity = {
  activityId: string;
  message: string;
};

type ExpenseSummary = {
  entriesCount: number;
  totalSpend: number;
  averageSpend: number;
  categoriesCount: number;
};

type ExpenseItem = {
  entryId: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes: string | null;
  type: string;
};

type ExpenseResponse = {
  summary: ExpenseSummary;
  items: ExpenseItem[];
};

const Activities: React.FC = () => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [expensesData, setExpensesData] = useState<ExpenseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, expensesRes] = await Promise.all([
        api.get('/doctor/dashboard'),
        api.get('/doctor/expenses')
      ]);
      setActivities(dashboardRes.data?.recentActivities ?? []);
      setExpensesData(expensesRes.data);
    } catch (error) {
      console.error('Failed to fetch activities and expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.category || !expenseForm.amount || !expenseForm.date) {
      return alert('Please fill all required fields');
    }
    
    setSubmitting(true);
    try {
      await api.post('/doctor/expenses', {
        ...expenseForm,
        amount: Number(expenseForm.amount),
        type: 'Expense'
      });
      setIsExpenseModalOpen(false);
      setExpenseForm({
        title: '',
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      await fetchData();
      emitDashboardRefresh('expenses:create');
      notifySuccess('Expense added successfully.');
    } catch (error) {
      console.error('Failed to add expense:', error);
      alert('Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/doctor/expenses/${entryId}`);
      await fetchData();
      emitDashboardRefresh('expenses:delete');
      notifySuccess('Expense deleted successfully.');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      alert('Failed to delete expense');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-outfit tracking-tight">Activities & Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Track your clinic's recent activity logs and financial expenses.</p>
        </div>
        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#1faa62] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#199453] sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Expenses */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-600">Total Spend</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : formatCurrency(expensesData?.summary?.totalSpend ?? 0)}
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-600">Avg. Spend / Item</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : formatCurrency(expensesData?.summary?.averageSpend ?? 0)}
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-600">Categories</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : expensesData?.summary?.categoriesCount ?? 0}
              </p>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="space-y-3 lg:hidden">
            {loading ? (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-500 shadow-sm">Loading expenses...</div>
            ) : !expensesData?.items?.length ? (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center shadow-sm">
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <IndianRupee className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-500">No expenses recorded yet.</p>
                  <p className="mt-1 text-xs text-gray-400">Click "Add Expense" to create your first record.</p>
                </div>
              </div>
            ) : (
              expensesData.items.map((item) => (
                <div key={item.entryId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-500">{item.date}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteExpense(item.entryId)}
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Delete Expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      {item.category}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</span>
                  </div>
                  {item.notes && <p className="mt-3 text-sm text-gray-500">{item.notes}</p>}
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">Expense Records</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200 text-[13px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-gray-500">Loading expenses...</td>
                    </tr>
                  ) : !expensesData?.items?.length ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <IndianRupee className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">No expenses recorded yet.</p>
                          <p className="text-xs text-gray-400 mt-1">Click "Add Expense" to create your first record.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expensesData.items.map((item) => (
                      <tr key={item.entryId} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-5 py-3 whitespace-nowrap text-gray-500">{item.date}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {item.title}
                          {item.notes && <p className="text-xs text-gray-400 font-normal mt-0.5 truncate max-w-[200px]">{item.notes}</p>}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-gray-900">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-5 py-3">
                          <button 
                            onClick={() => handleDeleteExpense(item.entryId)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activities */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full max-h-[800px] flex flex-col">
            <div className="p-5 border-b border-gray-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#1faa62]" />
              <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <span className="text-sm text-gray-500">Loading activities...</span>
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No recent activity.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activities.map((activity, index) => (
                    <div key={activity.activityId} className="relative pl-6">
                      {/* Timeline Line */}
                      {index !== activities.length - 1 && (
                        <div className="absolute left-[9px] top-6 bottom-[-24px] w-px bg-gray-200"></div>
                      )}
                      {/* Timeline Dot */}
                      <div className="absolute left-0 top-1.5 w-[19px] h-[19px] bg-white border-2 border-[#1faa62] rounded-full z-10 flex items-center justify-center">
                         <div className="w-1.5 h-1.5 bg-[#1faa62] rounded-full"></div>
                      </div>
                      
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100 shadow-sm">
                        {activity.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Add New Expense</h2>
              <button 
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({...expenseForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1faa62] focus:border-[#1faa62] outline-none transition-all text-sm"
                  placeholder="e.g., Medical Supplies"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    required
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1faa62] focus:border-[#1faa62] outline-none transition-all text-sm bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Software">Software</option>
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1faa62] focus:border-[#1faa62] outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1faa62] focus:border-[#1faa62] outline-none transition-all text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea 
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1faa62] focus:border-[#1faa62] outline-none transition-all text-sm resize-none h-20"
                  placeholder="Additional details..."
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[#1faa62] text-white rounded-lg hover:bg-[#199453] font-medium transition-colors disabled:opacity-70 text-sm"
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Activities;
