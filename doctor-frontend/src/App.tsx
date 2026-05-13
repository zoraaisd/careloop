import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import Layout from '@/components/layout/Layout';
import { clearAuthSession, getAuthSession, subscribeToAuthSession, type DoctorAuthSession } from '@/services/auth-storage';
import { getDoctorAccessState, type DoctorAccessState } from '@/services/doctor-access';
import './index.css';

const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const DoctorForcePasswordChangePage = React.lazy(() => import('@/pages/DoctorForcePasswordChangePage'));
const DoctorLoginPage = React.lazy(() => import('@/pages/DoctorLoginPage'));
const Subscription = React.lazy(() => import('@/pages/Subscription'));
const SubscriptionCheckout = React.lazy(() => import('@/pages/SubscriptionCheckout'));
const Appointments = React.lazy(() => import('@/pages/Appointments'));
const Inventory = React.lazy(() => import('@/pages/Inventory'));
const Suppliers = React.lazy(() => import('@/pages/Suppliers'));
const Prescriptions = React.lazy(() => import('@/pages/Prescriptions'));
const Automation = React.lazy(() => import('@/pages/Automation'));
const Reports = React.lazy(() => import('@/pages/Reports'));
const Ticket = React.lazy(() => import('@/pages/Ticket'));
const Patients = React.lazy(() => import('@/pages/Patients'));
const Calendar = React.lazy(() => import('@/pages/Calendar'));
const Activities = React.lazy(() => import('@/pages/Activities'));
const Clinic = React.lazy(() => import('@/pages/clinic/Clinic'));
const AddDoctorPage = React.lazy(() => import('@/pages/clinic/addDoctorpage'));
const Chat = React.lazy(() => import('@/pages/Chat'));

const DoctorPendingPanel: React.FC<{
  message?: string;
  isChecking: boolean;
}> = ({ message, isChecking }) => (
  <main className="min-h-screen bg-[#f8fbf9] px-4 py-8 text-text">
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

const RouteLoader: React.FC = () => (
  <div className="min-h-screen bg-[#f8fbf9] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const [isReady, setIsReady] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);
  const [accessState, setAccessState] = React.useState<DoctorAccessState | null>(null);
  const [session, setSession] = React.useState<DoctorAuthSession | null>(() => getAuthSession());

  React.useEffect(() => {
    return subscribeToAuthSession(() => {
      setSession(getAuthSession());
    });
  }, []);

  React.useEffect(() => {
    const loadAccessState = async () => {
      setIsChecking(true);
      setIsReady(false);

      if (!session?.token || session.role !== 'doctor') {
        clearAuthSession();
        setAccessState(null);
        setIsChecking(false);
        setIsReady(true);
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
    return (
      <BrowserRouter>
        <React.Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/login" element={<DoctorLoginPage />} />
            <Route path="/force-password-change" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    );
  }

  if (session.mustChangePassword) {
    return (
      <BrowserRouter>
        <React.Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/force-password-change" element={<DoctorForcePasswordChangePage />} />
            <Route path="/login" element={<Navigate to="/force-password-change" replace />} />
            <Route path="*" element={<Navigate to="/force-password-change" replace />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    );
  }

  if (!accessState?.canAccessPortal) {
    return (
      <BrowserRouter>
        <React.Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/login" element={<DoctorLoginPage />} />
            <Route path="/force-password-change" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="*"
              element={<DoctorPendingPanel isChecking={isChecking} message={accessState?.message} />}
            />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <React.Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
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
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/doctor/suppliers" element={<Navigate to="/suppliers" replace />} />
            <Route path="/prescriptions" element={<Prescriptions />} />
            <Route path="/doctor/prescriptions" element={<Navigate to="/prescriptions" replace />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/doctor/automation" element={<Navigate to="/automation" replace />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/doctor/reports" element={<Navigate to="/reports" replace />} />
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
        </React.Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
