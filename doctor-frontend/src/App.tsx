import React from 'react';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import Subscription from '@/pages/Subscription';
import Appointments from '@/pages/Appointments';
import Inventory from '@/pages/Inventory';
import Prescriptions from '@/pages/Prescriptions';
import Automation from '@/pages/Automation';
import Ticket from '@/pages/Ticket';
import Patients from '@/pages/Patients';
import Calendar from '@/pages/Calendar';
import api from '@/services/api';
import {
  getDoctorSession,
  saveDoctorSession,
  type DoctorSession,
} from '@/services/session';
import './index.css';

type DoctorAccessStateResponse = {
  approvalStatus: 'pending' | 'approved' | 'rejected';
  accessState: 'full_access' | 'pending_review' | 'subscription_required' | 'rejected';
  canAccessPortal: boolean;
  message: string;
};

const resolvePortalAccess = (
  approvalStatus?: DoctorSession['approvalStatus'],
  canAccessPortal?: boolean,
): boolean => approvalStatus === 'approved' || Boolean(canAccessPortal);

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
  const [session, setSession] = useState<DoctorSession | null>(() => getDoctorSession());
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const canAccessPortal = Boolean(
    session?.role === 'doctor' &&
      resolvePortalAccess(session.approvalStatus, session.canAccessPortal),
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const role = params.get('role');
    const userId = params.get('userId');
    const approvalStatus = params.get('approvalStatus');
    const accessState = params.get('accessState');
    const canAccessPortalParam = params.get('canAccessPortal');
    const message = params.get('message');

    if (token && role && userId) {
      const nextSession: DoctorSession = {
        token,
        role: role as DoctorSession['role'],
        userId,
        approvalStatus: approvalStatus as DoctorSession['approvalStatus'],
        accessState: accessState as DoctorSession['accessState'],
        canAccessPortal: resolvePortalAccess(
          approvalStatus as DoctorSession['approvalStatus'],
          canAccessPortalParam === 'true',
        ),
        message: message ?? undefined,
      };
      saveDoctorSession(nextSession);
      setSession(nextSession);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    setIsReady(true);
  }, []);

  const checkAccessState = async () => {
    if (!getDoctorSession()?.token) return;

    setIsChecking(true);
    try {
      const { data } = await api.get<DoctorAccessStateResponse>('/doctor/access-state');
      const previous = getDoctorSession();
      if (!previous) return;
      const nextSession: DoctorSession = {
        ...previous,
        approvalStatus: data.approvalStatus,
        accessState: data.accessState,
        canAccessPortal: resolvePortalAccess(data.approvalStatus, data.canAccessPortal),
        message: data.message,
      };
      saveDoctorSession(nextSession);
      setSession(nextSession);
    } catch {
      // Keep current state on fetch failure.
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!session?.token) return;
    void checkAccessState();
  }, [session?.token]);

  useEffect(() => {
    if (!session?.token || canAccessPortal) return;
    const interval = window.setInterval(() => {
      void checkAccessState();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [canAccessPortal, session?.token]);

  useEffect(() => {
    if (!canAccessPortal) return;
    if (window.location.pathname !== '/dashboard') {
      window.location.replace('/dashboard');
    }
  }, [canAccessPortal]);

  if (!isReady) return null;

  if (!session?.token || session.role !== 'doctor') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<DoctorPendingPanel isChecking={false} message="Please login from CareLoop auth app." />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      {canAccessPortal ? (
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/doctor/dashboard" element={<Navigate to="/dashboard" replace />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/prescriptions" element={<Prescriptions />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/ticket" element={<Ticket />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/doctors" element={<Navigate to="/patients" replace />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/chat" element={<Navigate to="/ticket" replace />} />
            <Route path="/activities" element={<Navigate to="/dashboard" replace />} />
            <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
            <Route path="/doctor/panel" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/doctor/panel" replace />} />
          <Route path="/doctor/dashboard" element={<Navigate to="/doctor/panel" replace />} />
          <Route
            path="/doctor/panel"
            element={<DoctorPendingPanel isChecking={isChecking} message={session.message} />}
          />
          <Route path="*" element={<Navigate to="/doctor/panel" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
