import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, CreditCard, RefreshCw, Search, XCircle } from 'lucide-react';

import {
  formatCurrency,
  getBilling,
  getClinicSubscriptions,
  getClinics,
  getPayments,
  type BillingResponse,
  type Clinic,
  type ClinicSubscriptionRecord,
  type PaymentRecord,
} from '@/services/admin';

type StatusFilter = 'All' | 'Active' | 'Trial' | 'Expired';
type QuickFilter = 'today' | 'yesterday' | 'last7' | 'last30' | '';

type EnrichedSubscription = ClinicSubscriptionRecord & {
  amount: number;
  currency: string;
  email: string;
  paymentType: string;
};

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

  const days = filter === 'last7' ? 7 : 30;
  const start = new Date();
  start.setDate(today.getDate() - days);
  start.setHours(0, 0, 0, 0);

  return value >= start && value <= today;
};

const ClinicSubscriptions = () => {
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<ClinicSubscriptionRecord[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [planFilter, setPlanFilter] = useState('All Plans');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('');
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const [billingResponse, paymentResponse, subscriptionResponse, clinicResponse] = await Promise.all([
        getBilling(),
        getPayments(),
        getClinicSubscriptions(),
        getClinics(),
      ]);
      setBilling(billingResponse);
      setPayments(paymentResponse);
      setSubscriptions(subscriptionResponse);
      setClinics(clinicResponse.clinics);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSubscriptions();
  }, []);

  const enrichedSubscriptions = useMemo<EnrichedSubscription[]>(() => {
    const plansById = new Map((billing?.plans ?? []).map((plan) => [plan.id, plan]));
    const clinicsById = new Map(clinics.map((clinic) => [clinic.id, clinic]));

    return subscriptions.map((subscription) => {
      const payment = payments.find(
        (item) => item.clinicId === subscription.clinicId && item.planId === subscription.planId,
      );
      const plan = plansById.get(subscription.planId);
      const clinic = clinicsById.get(subscription.clinicId);

      return {
        ...subscription,
        amount: payment?.amount ?? plan?.price ?? 0,
        currency: payment?.currency ?? plan?.currency ?? 'INR',
        email: clinic?.email ?? '',
        paymentType: 'Upi',
      };
    });
  }, [billing?.plans, clinics, payments, subscriptions]);

  const summary = useMemo(() => {
    const active = enrichedSubscriptions.filter((item) => item.status === 'Active').length;
    const trial = enrichedSubscriptions.filter((item) => item.status === 'Trial').length;
    const expired = enrichedSubscriptions.filter((item) => item.status === 'Expired').length;

    return {
      total: enrichedSubscriptions.length,
      active,
      trial,
      expired,
    };
  }, [enrichedSubscriptions]);

  const planOptions = useMemo(
    () => ['All Plans', ...Array.from(new Set(enrichedSubscriptions.map((item) => item.planName))).filter(Boolean)],
    [enrichedSubscriptions],
  );

  const filteredSubscriptions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return enrichedSubscriptions.filter((subscription) => {
      const searchMatch =
        !term ||
        [subscription.clinicName, subscription.email, subscription.planName]
          .join(' ')
          .toLowerCase()
          .includes(term);
      const statusMatch = statusFilter === 'All' || subscription.status === statusFilter;
      const planMatch = planFilter === 'All Plans' || subscription.planName === planFilter;
      const valueDate = new Date(subscription.startDate);
      const startMatch = !startDate || (!Number.isNaN(valueDate.getTime()) && valueDate >= new Date(startDate));
      const endMatch = !endDate || (!Number.isNaN(valueDate.getTime()) && valueDate <= new Date(endDate));

      return (
        searchMatch &&
        statusMatch &&
        planMatch &&
        startMatch &&
        endMatch &&
        matchesQuickFilter(subscription.startDate, quickFilter)
      );
    });
  }, [endDate, enrichedSubscriptions, planFilter, quickFilter, search, startDate, statusFilter]);

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

    if (filter === 'last7' || filter === 'last30') {
      const start = new Date();
      start.setDate(today.getDate() - (filter === 'last7' ? 7 : 30));
      setStartDate(toDateInputValue(start));
      setEndDate(toDateInputValue(today));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setPlanFilter('All Plans');
    setStartDate('');
    setEndDate('');
    setQuickFilter('');
  };

  const applyStatusCardFilter = (status: StatusFilter) => {
    setStatusFilter(status);
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
          <h1 className="text-2xl font-bold text-slate-950">Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-500">Manage all subscription plans and statuses</p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          onClick={() => void loadSubscriptions()}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button
          className={`flex items-center justify-between rounded-xl border bg-white p-5 text-left shadow-md shadow-slate-200/50 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg ${
            statusFilter === 'All' ? 'border-slate-400 ring-2 ring-slate-100' : 'border-slate-200'
          }`}
          onClick={() => applyStatusCardFilter('All')}
          type="button"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{summary.total}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <CreditCard className="h-5 w-5" />
          </div>
        </button>
        <button
          className={`flex items-center justify-between rounded-xl border bg-white p-5 text-left shadow-md shadow-slate-200/50 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg ${
            statusFilter === 'Active' ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'
          }`}
          onClick={() => applyStatusCardFilter('Active')}
          type="button"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Active</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.active}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </button>
        <button
          className={`flex items-center justify-between rounded-xl border bg-white p-5 text-left shadow-md shadow-slate-200/50 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg ${
            statusFilter === 'Trial' ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
          }`}
          onClick={() => applyStatusCardFilter('Trial')}
          type="button"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Trial</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{summary.trial}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </button>
        <button
          className={`flex items-center justify-between rounded-xl border bg-white p-5 text-left shadow-md shadow-slate-200/50 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg ${
            statusFilter === 'Expired' ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'
          }`}
          onClick={() => applyStatusCardFilter('Expired')}
          type="button"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Expired</p>
            <p className="mt-2 text-2xl font-bold text-red-700">{summary.expired}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <XCircle className="h-5 w-5" />
          </div>
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-200 p-4">
          <div className="flex flex-wrap gap-2">
            {(['All', 'Active', 'Trial', 'Expired'] as StatusFilter[]).map((status) => (
              <button
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase transition ${
                  statusFilter === status
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                key={status}
                onClick={() => setStatusFilter(status)}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>

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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment Type</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                    Loading subscriptions...
                  </td>
                </tr>
              ) : filteredSubscriptions.length > 0 ? (
                filteredSubscriptions.map((subscription) => (
                  <tr className="border-b border-slate-100 text-slate-800 transition hover:bg-emerald-50/40" key={subscription.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{subscription.clinicName}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{subscription.email || subscription.clinicId}</p>
                    </td>
                    <td className="px-4 py-4 font-medium">{subscription.planName}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          subscription.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : subscription.status === 'Trial'
                            ? 'bg-amber-50 text-amber-700'
                            : subscription.status === 'Expired'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {subscription.status}
                      </span>
                    </td>
                    <td className="numeric-display px-4 py-4 font-medium">
                      {formatCurrency(subscription.amount, subscription.currency)}
                    </td>
                    <td className="px-4 py-4">{subscription.paymentType}</td>
                    <td className="numeric-inline px-4 py-4">{formatDate(subscription.startDate)}</td>
                    <td className="numeric-inline px-4 py-4">{formatDate(subscription.endDate)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                    No subscription records match your filters.
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

export { ClinicSubscriptions };
