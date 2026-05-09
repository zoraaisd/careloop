import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import Subscription from '@/pages/Subscription';
import SubscriptionCheckout from '@/pages/SubscriptionCheckout';
import Appointments from '@/pages/Appointments';
import Inventory from '@/pages/Inventory';
import Prescriptions from '@/pages/Prescriptions';
import Automation from '@/pages/Automation';
import Ticket from '@/pages/Ticket';
import Patients from '@/pages/Patients';
import Calendar from '@/pages/Calendar';
import Activities from '@/pages/Activities';
import Clinic from '@/pages/clinic/Clinic';
import AddDoctorPage from '@/pages/clinic/addDoctorpage';
import Chat from '@/pages/Chat';
import { getAuthSession } from '@/services/auth-storage';
import { getDoctorAccessState, type DoctorAccessState } from '@/services/doctor-access';
import './index.css';

const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:5173';

const DoctorPendingPanel: React.FC<{
  message?: string;
  isChecking: boolean;
}> = ({ message, isChecking }) => (
  <main className="min-h-screen bg-[#f8fbf9] px-4 py-8 text-[#1d3029]">
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">Doctor Panel</h1>
      <p className="mt-3 text-sm text-slate-600">
        {message || 'Your profile is under admin review. After approval, your doctor dashboard will open.'}
      </p>
      <p className="mt-5 inline-flex rounded-lg bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
        {isChecking ? 'Checking...' : 'Waiting for approval...'}
      </p>
    </div>
  </main>
);

function App() {
  const [isReady, setIsReady] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);
  const [accessState, setAccessState] = React.useState<DoctorAccessState | null>(null);
  const session = getAuthSession();

  React.useEffect(() => {
    const loadAccessState = async () => {
      if (!session?.token || session.role !== 'doctor') {
        window.location.assign(`${authAppUrl}/login`);
        return;
      }

      try {
        const response = await getDoctorAccessState();
        setAccessState(response);
      } catch {
        setAccessState(
          session?.role === 'doctor'
            ? {
                approvalStatus: session.approvalStatus ?? 'pending',
                subscriptionStatus: 'inactive',
                trialStartedAt: null,
                trialEndsAt: null,
                accessState: session.accessState ?? 'pending_review',
                canAccessPortal: session.canAccessPortal ?? false,
                canAppearPublicly: false,
                hasActiveTrial: false,
                message:
                  session.message ??
                  'Unable to refresh doctor access right now. Using your last known access state.',
              }
            : null,
        );
      } finally {
        setIsChecking(false);
        setIsReady(true);
      }
    };

    void loadAccessState();
  }, [session?.role, session?.token]);

  if (!isReady) {
    return null;
  }

  if (!session?.token || session.role !== 'doctor') {
    return null;
  }

  if (!accessState?.canAccessPortal) {
    return (
      <BrowserRouter>
        <Routes>
          <Route
            path="*"
            element={<DoctorPendingPanel isChecking={isChecking} message={accessState?.message} />}
          />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/doctor/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/subscription/checkout" element={<SubscriptionCheckout />} />
          <Route path="/doctor/subscription" element={<Navigate to="/subscription" replace />} />
          <Route path="/doctor/subscription/checkout" element={<Navigate to="/subscription/checkout" replace />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/doctor/appointments" element={<Navigate to="/appointments" replace />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/doctor/inventory" element={<Navigate to="/inventory" replace />} />
          <Route path="/prescriptions" element={<Prescriptions />} />
          <Route path="/doctor/prescriptions" element={<Navigate to="/prescriptions" replace />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="/doctor/automation" element={<Navigate to="/automation" replace />} />
          <Route path="/ticket" element={<Ticket />} />
          <Route path="/doctor/ticket" element={<Navigate to="/ticket" replace />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/doctor/patients" element={<Navigate to="/patients" replace />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/doctor/calendar" element={<Navigate to="/calendar" replace />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/doctor/activities" element={<Navigate to="/activities" replace />} />
          <Route path="/clinic" element={<Clinic />} />
          <Route path="/doctor/clinic" element={<Navigate to="/clinic" replace />} />
          <Route path="/clinic/add-doctor" element={<AddDoctorPage />} />
          <Route path="/doctor/clinic/add-doctor" element={<Navigate to="/clinic/add-doctor" replace />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/doctor/chat" element={<Navigate to="/chat" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
