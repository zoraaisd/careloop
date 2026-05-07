import { useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCw, Search, TrendingUp } from 'lucide-react';

import {
  getBilling,
  getClinics,
  getPayments,
  type Clinic,
  type PaymentRecord,
} from '@/services/admin';

type QuickFilter = 'today' | 'yesterday' | 'last7' | 'last30' | '';

type RevenueTransaction = PaymentRecord & {
  ownerName: string;
  paymentType: string;
};

const formatRs = (amount: number): string => `Rs ${amount.toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || '-';
  }

  return date.toLocaleDateString('en-IN');
};

const toDateInputValue = (date: Date): string => date.toISOString().slice(0, 10);

const isSameDate = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const matchesQuickFilter = (dateValue: string, filter: QuickFilter): boolean => {
  if (!filter) {
    return true;
  }

  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) {
    return false;
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (filter === 'today') {
    return isSameDate(value, today);
  }

  if (filter === 'yesterday') {
    return isSameDate(value, yesterday);
  }

  const start = new Date();
  start.setDate(today.getDate() - (filter === 'last7' ? 7 : 30));
  start.setHours(0, 0, 0, 0);

  return value >= start && value <= today;
};

const Revenue = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [planOptions, setPlanOptions] = useState<string[]>(['All Plans']);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('All Plans');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('');
  const [isLoading, setIsLoading] = useState(true);

  const loadRevenue = async () => {
    setIsLoading(true);
    try {
      const [paymentResponse, clinicResponse, billingResponse] = await Promise.all([
        getPayments(),
        getClinics(),
        getBilling(),
      ]);
      setPayments(paymentResponse);
      setClinics(clinicResponse.clinics);
      setPlanOptions([
        'All Plans',
        ...Array.from(new Set([
          ...billingResponse.plans.map((plan) => plan.name),
          ...paymentResponse.map((payment) => payment.planName),
        ])).filter(Boolean),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRevenue();
  }, []);

  const transactions = useMemo<RevenueTransaction[]>(() => {
    const clinicsById = new Map(clinics.map((clinic) => [clinic.id, clinic]));

    return payments.map((payment) => {
      const clinic = clinicsById.get(payment.clinicId);

      return {
        ...payment,
        ownerName: clinic?.ownerName ?? clinic?.email ?? payment.clinicId,
        paymentType: 'UPI',
      };
    });
  }, [clinics, payments]);

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const paidDate = new Date(transaction.paidOn);
      const searchMatch =
        !term ||
        [transaction.clinicName, transaction.ownerName, transaction.planName, transaction.id]
          .join(' ')
          .toLowerCase()
          .includes(term);
      const planMatch = planFilter === 'All Plans' || transaction.planName === planFilter;
      const startMatch = !startDate || (!Number.isNaN(paidDate.getTime()) && paidDate >= new Date(startDate));
      const endMatch = !endDate || (!Number.isNaN(paidDate.getTime()) && paidDate <= new Date(endDate));

      return (
        searchMatch &&
        planMatch &&
        startMatch &&
        endMatch &&
        matchesQuickFilter(transaction.paidOn, quickFilter)
      );
    });
  }, [endDate, planFilter, quickFilter, search, startDate, transactions]);

  const paidTransactions = filteredTransactions.filter((transaction) => transaction.status === 'Paid');
  const totalRevenue = paidTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  const applyQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter);

    const today = new Date();
    if (filter === 'today') {
      const value = toDateInputValue(today);
      setStartDate(value);
      setEndDate(value);
      return;
    }

    if (filter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const value = toDateInputValue(yesterday);
      setStartDate(value);
      setEndDate(value);
      return;
    }

    const start = new Date();
    start.setDate(today.getDate() - (filter === 'last7' ? 7 : 30));
    setStartDate(toDateInputValue(start));
    setEndDate(toDateInputValue(today));
  };

  const clearFilters = () => {
    setSearch('');
    setPlanFilter('All Plans');
    setStartDate('');
    setEndDate('');
    setQuickFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Revenue</h1>
          <p className="mt-1 text-sm text-slate-500">Track income and payment transactions</p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          onClick={() => void loadRevenue()}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/50">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Revenue</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{formatRs(totalRevenue)}</p>
            <p className="mt-2 text-xs font-medium text-emerald-700">↗ +18% filtered results</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <span className="text-xl font-semibold">₹</span>
          </div>
        </article>
        <article className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/50">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Transactions</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{filteredTransactions.length}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <TrendingUp className="h-5 w-5" />
          </div>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-200 p-4">
          <h2 className="text-base font-bold text-slate-950">All Transactions</h2>
          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by business name or plan"
                value={search}
              />
            </label>
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => setPlanFilter(event.target.value)}
              value={planFilter}
            >
              {planOptions.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
            <label className="relative block">
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setQuickFilter('');
                }}
                type="date"
                value={startDate}
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </label>
            <label className="relative block">
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setQuickFilter('');
                }}
                type="date"
                value={endDate}
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Today', value: 'today' },
              { label: 'Yesterday', value: 'yesterday' },
              { label: 'Last 7 Days', value: 'last7' },
              { label: 'Last 30 Days', value: 'last30' },
            ].map((item) => (
              <button
                className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                  quickFilter === item.value
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
                key={item.value}
                onClick={() => applyQuickFilter(item.value as QuickFilter)}
                type="button"
              >
                {item.label}
              </button>
            ))}
            <button
              className="rounded-full bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              onClick={clearFilters}
              type="button"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr className="border-b border-slate-100 text-slate-800 transition hover:bg-emerald-50/40" key={transaction.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{transaction.clinicName}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{transaction.ownerName}</p>
                    </td>
                    <td className="px-4 py-4 font-medium">{transaction.planName}</td>
                    <td className="numeric-display px-4 py-4 font-bold text-slate-950">
                      {formatRs(transaction.amount)}
                    </td>
                    <td className="px-4 py-4">{transaction.paymentType}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-700">
                        SUB-{transaction.planName.toUpperCase()}-{transaction.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="mt-0.5 text-xs uppercase text-slate-400">
                        {transaction.planName} subscription activated
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          transaction.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : transaction.status === 'Failed'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="numeric-inline px-4 py-4">{formatDate(transaction.paidOn)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                    No transactions match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export { Revenue };
