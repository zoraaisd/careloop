import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';

import {
  getClinicSubscriptions,
  getDoctorRequests,
  type ClinicSubscriptionRecord,
  type DoctorRequest,
} from '@/services/admin';

type UserFilter = 'all' | 'active' | 'trial' | 'expired';

type AllUsersProps = {
  filter?: UserFilter;
};

const formatDate = (value?: string | null): string => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN');
};

const getUserStatus = (doctor: DoctorRequest): 'Active' | 'Trial' | 'Expired' => {
  if (doctor.subscriptionStatus === 'active') {
    return 'Active';
  }

  if (doctor.trialEndsAt && new Date(doctor.trialEndsAt).getTime() >= Date.now()) {
    return 'Trial';
  }

  return 'Expired';
};

const filterTitle: Record<UserFilter, string> = {
  all: 'All Users',
  active: 'Active Users',
  trial: 'Trial Users',
  expired: 'Expired Users',
};

const AllUsers = ({ filter = 'all' }: AllUsersProps) => {
  const [doctors, setDoctors] = useState<DoctorRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<ClinicSubscriptionRecord[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const [doctorResponse, subscriptionResponse] = await Promise.all([
          getDoctorRequests(),
          getClinicSubscriptions(),
        ]);
        setDoctors(doctorResponse);
        setSubscriptions(subscriptionResponse);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const subscriptionsByDoctor = useMemo(() => {
    const map = new Map<string, ClinicSubscriptionRecord>();
    subscriptions.forEach((subscription) => {
      map.set(subscription.clinicId, subscription);
    });
    return map;
  }, [subscriptions]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const status = getUserStatus(doctor);
      const statusMatches = filter === 'all' || status.toLowerCase() === filter;
      const queryMatches =
        !term ||
        [doctor.name, doctor.email, doctor.clinicName, doctor.phone, doctor.city]
          .join(' ')
          .toLowerCase()
          .includes(term);

      return statusMatches && queryMatches;
    });
  }, [doctors, filter, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">{filterTitle[filter]}</h1>
        <p className="mt-1 text-sm text-slate-500">View owner accounts, clinic details, plans, and account status.</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, clinic..."
              value={query}
            />
          </label>
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Users className="h-4 w-4" />
            {filteredUsers.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Clinic Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plan Created</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((doctor) => {
                  const status = getUserStatus(doctor);
                  const subscription = subscriptionsByDoctor.get(doctor.userId);
                  const planText = subscription && subscription.amount > 0
                    ? subscription.planName
                    : 'No paid plan';
                  const planCreated = subscription?.startDate ?? doctor.trialStartedAt;
                  const activeUntil = subscription?.endDate ?? doctor.trialEndsAt;

                  return (
                    <tr className="border-b border-slate-100 text-slate-800 transition hover:bg-emerald-50/40" key={doctor.userId}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">{doctor.name || '-'}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{doctor.email || '-'}</p>
                      </td>
                      <td className="px-4 py-4 font-medium">{doctor.clinicName || '-'}</td>
                      <td className="numeric-inline px-4 py-4">{doctor.phone || '-'}</td>
                      <td className="px-4 py-4 font-medium">{planText}</td>
                      <td className="px-4 py-4">{status}</td>
                      <td className="numeric-inline px-4 py-4">{formatDate(planCreated)}</td>
                      <td className="numeric-inline px-4 py-4">{formatDate(activeUntil)}</td>
                      <td className="numeric-inline px-4 py-4">{formatDate(doctor.createdAt)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                    No users match this view.
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

export { AllUsers };
