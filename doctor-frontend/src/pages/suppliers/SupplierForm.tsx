import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supplierApi } from './supplierApi';

const initialForm = {
  supplierName: '',
  companyName: '',
  supplierCode: 'SUP-001',
  category: 'Medicine',
  licenseNumber: '',
  contactPerson: '',
  phone: '',
  email: '',
  alternatePhone: '',
  addressLine1: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
};

const Field = ({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <label className="space-y-1">
    <span className="text-xs font-bold text-[#607d74]">{label}{required ? ' *' : ''}</span>
    {children}
  </label>
);

const inputClass = 'w-full rounded-lg border border-[#dce4e0] bg-white px-3 py-2 text-sm outline-none focus:border-[#16924d]';

const SupplierForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!editId) return;
    void supplierApi.details(editId).then((data) => {
      setForm((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(data.supplier).map(([key, value]) => [key, value ?? ''])),
      }) as typeof initialForm);
    });
  }, [editId]);

  useEffect(() => {
    if (editId) return;

    setForm((current) => ({
      ...current,
      supplierCode: current.supplierCode || 'SUP-001',
    }));

    void supplierApi.list()
      .then((response) => {
        setForm((current) => ({
          ...current,
          supplierCode: `SUP-${String(response.total + 1).padStart(3, '0')}`,
        }));
      })
      .catch(() => {
        setForm((current) => ({
          ...current,
          supplierCode: current.supplierCode || 'SUP-001',
        }));
      });
  }, [editId]);

  const update = (field: keyof typeof initialForm, value: string | number | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const saved = editId ? await supplierApi.update(editId, form as any) : await supplierApi.create(form as any);
      navigate('/suppliers', {
        state: {
          supplierNotice: editId ? 'Supplier updated successfully' : 'Supplier added successfully',
          supplierId: saved.id,
        },
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to save supplier';
      setNotice({ type: 'error', text: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {notice ? (
        <div className={`fixed right-6 top-24 z-50 rounded-lg border px-4 py-3 text-sm font-semibold shadow-lg ${
          notice.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {notice.text}
        </div>
      ) : null}

      <div>
        <div>
          <Link to="/suppliers" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-[#13804e]"><ArrowLeft className="h-4 w-4" /> Suppliers</Link>
          <h1 className="text-2xl font-bold text-[#142e26]">{editId ? 'Edit Supplier' : 'Add New Supplier'}</h1>
          <p className="text-sm text-[#607d74]">Basic information, contact details and address.</p>
        </div>
      </div>

      <section className="rounded-lg border border-[#dce4e0] bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-[#142e26]">Basic Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Supplier Name" required><input className={inputClass} value={form.supplierName} onChange={(event) => update('supplierName', event.target.value)} required /></Field>
          <Field label="Company Name"><input className={inputClass} value={form.companyName} onChange={(event) => update('companyName', event.target.value)} /></Field>
          <Field label="Supplier Code">
            <input
              className={`${inputClass} bg-[#f4f8f6] text-[#607d74]`}
              readOnly
              value={form.supplierCode}
              placeholder="Auto generated on save"
            />
          </Field>
          <Field label="Category" required><select className={inputClass} value={form.category} onChange={(event) => update('category', event.target.value)}><option>Medicine</option><option>Lab Supplies</option><option>Surgical</option><option>Equipment</option></select></Field>
          <Field label="License Number"><input className={inputClass} value={form.licenseNumber} onChange={(event) => update('licenseNumber', event.target.value)} /></Field>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce4e0] bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-[#142e26]">Contact Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Contact Person"><input className={inputClass} value={form.contactPerson} onChange={(event) => update('contactPerson', event.target.value)} /></Field>
          <Field label="Phone Number" required><input className={inputClass} value={form.phone} onChange={(event) => update('phone', event.target.value)} required /></Field>
          <Field label="Email"><input className={inputClass} value={form.email} onChange={(event) => update('email', event.target.value)} /></Field>
          <Field label="Alternate Phone"><input className={inputClass} value={form.alternatePhone} onChange={(event) => update('alternatePhone', event.target.value)} /></Field>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce4e0] bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-[#142e26]">Optional Additional Fields</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Address"><input className={inputClass} value={form.addressLine1} onChange={(event) => update('addressLine1', event.target.value)} /></Field>
          <Field label="City"><input className={inputClass} value={form.city} onChange={(event) => update('city', event.target.value)} /></Field>
          <Field label="State"><input className={inputClass} value={form.state} onChange={(event) => update('state', event.target.value)} /></Field>
          <Field label="Country"><input className={inputClass} value={form.country} onChange={(event) => update('country', event.target.value)} /></Field>
          <Field label="Pincode"><input className={inputClass} value={form.pincode} onChange={(event) => update('pincode', event.target.value)} /></Field>
        </div>
      </section>

      <div className="flex justify-end gap-2 rounded-lg border border-[#dce4e0] bg-white p-4 shadow-sm">
        <Link to="/suppliers" className="rounded-lg border border-[#dce4e0] bg-white px-4 py-2 text-sm font-semibold">Cancel</Link>
        <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white" disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

export default SupplierForm;
