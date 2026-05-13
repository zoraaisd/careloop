import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import SupplierShell from './SupplierShell';
import SupplierList from './SupplierList';
import SupplierForm from './SupplierForm';
import SupplierDetails from './SupplierDetails';
import PurchaseOrders from './PurchaseOrders';

const SuppliersModule: React.FC = () => (
  <Routes>
    <Route element={<SupplierShell />}>
      <Route index element={<SupplierList />} />
      <Route path="list" element={<Navigate replace to="/suppliers" />} />
      <Route path="add" element={<SupplierForm />} />
      <Route path="purchase-orders" element={<PurchaseOrders />} />
      <Route path=":supplierId" element={<SupplierDetails />} />
      <Route path="*" element={<Navigate replace to="/suppliers" />} />
    </Route>
  </Routes>
);

export default SuppliersModule;
