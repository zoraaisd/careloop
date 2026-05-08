import React from 'react';
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
import Clinic from '@/pages/clinic/Clinic';
import AddDoctorPage from '@/pages/clinic/addDoctorpage';
import { getAuthSession } from '@/services/auth-storage';
import './index.css';

function RequireDoctorAuth({ children }: { children: React.ReactNode }) {
  const session = getAuthSession();
  const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:5173';

  if (!session?.token) {
    window.location.assign(`${authAppUrl}/login`);
    return null;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <RequireDoctorAuth>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/doctor/dashboard" element={<Navigate to="/dashboard" replace />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/doctor/subscription" element={<Navigate to="/subscription" replace />} />
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
            <Route path="/clinic" element={<Clinic />} />
            <Route path="/doctor/clinic" element={<Navigate to="/clinic" replace />} />
            <Route path="/clinic/add-doctor" element={<AddDoctorPage />} />
            <Route path="/doctor/clinic/add-doctor" element={<Navigate to="/clinic/add-doctor" replace />} />
          </Routes>
        </Layout>
      </RequireDoctorAuth>
    </BrowserRouter>
  );
}

export default App;

