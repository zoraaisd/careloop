import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
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

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const Field = ({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <label className="space-y-1">
    <span className="text-xs font-bold text-[#607d74]">{label}{required ? ' *' : ''}</span>
    {children}
  </label>
);

const inputClass = 'w-full rounded-lg border border-[#dce4e0] bg-white px-3 py-2 text-sm outline-none focus:border-[#16924d]';
const editableFormKeys = Object.keys(initialForm) as Array<keyof typeof initialForm>;

const SupplierForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [existingDocumentNames, setExistingDocumentNames] = useState<{ license: string | null; idProof: string | null }>({
    license: null,
    idProof: null,
  });
  const licenseInputRef = React.useRef<HTMLInputElement | null>(null);
  const idProofInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editId) return;
    void supplierApi.details(editId).then((data) => {
      const nextForm = editableFormKeys.reduce((accumulator, key) => {
        const value = data.supplier[key];
        accumulator[key] = typeof value === 'string' ? value : value ?? '';
        return accumulator;
      }, { ...initialForm });

      setForm(nextForm);
      setExistingDocumentNames({
        license: data.supplier.licenseDocumentName ?? null,
        idProof: data.supplier.idProofDocumentName ?? null,
      });
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

  const clearSelectedFile = (type: 'license' | 'idProof') => {
    if (type === 'license') {
      setLicenseFile(null);
      if (licenseInputRef.current) {
        licenseInputRef.current.value = '';
      }
      return;
    }

    setIdProofFile(null);
    if (idProofInputRef.current) {
      idProofInputRef.current.value = '';
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const requiresLicenseDocument = !existingDocumentNames.license && !licenseFile;
    const requiresIdProofDocument = !existingDocumentNames.idProof && !idProofFile;

    if (requiresLicenseDocument || requiresIdProofDocument) {
      setNotice({
        type: 'error',
        text: requiresLicenseDocument && requiresIdProofDocument
          ? 'Please upload both License and ID Proof documents.'
          : requiresLicenseDocument
            ? 'Please upload the License document.'
            : 'Please upload the ID Proof document.',
      });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const payload: Record<string, unknown> = { ...form };

      if (licenseFile) {
        payload.licenseDocumentFileName = licenseFile.name;
        payload.licenseDocumentDataUrl = await fileToDataUrl(licenseFile);
      }

      if (idProofFile) {
        payload.idProofDocumentFileName = idProofFile.name;
        payload.idProofDocumentDataUrl = await fileToDataUrl(idProofFile);
      }

      await (editId ? supplierApi.update(editId, payload) : supplierApi.create(payload));
      navigate('/suppliers', {
        state: {
          supplierNotice: editId ? 'Supplier updated successfully' : 'Supplier added successfully',
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
    <form className="space-y-5 [&_button]:cursor-pointer [&_a]:cursor-pointer" onSubmit={onSubmit}>
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

      <section className="rounded-lg border border-[#dce4e0] bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-[#142e26]">Documents</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="License" required>
            <input
              ref={licenseInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(event) => setLicenseFile(event.target.files?.[0] ?? null)}
              required={!editId || !existingDocumentNames.license}
              type="file"
            />
            <div className="flex min-h-[46px] items-center justify-between rounded-lg border border-[#dce4e0] bg-white px-3 py-2">
              <div className="min-w-0 flex-1">
                {licenseFile ? (
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#142e26]">{licenseFile.name}</p>
                    <button
                      className="rounded-full p-1 text-[#607d74] transition hover:bg-[#eef3f0] hover:text-[#142e26]"
                      onClick={() => clearSelectedFile('license')}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : existingDocumentNames.license ? (
                  <p className="truncate text-sm font-medium text-[#607d74]">{existingDocumentNames.license}</p>
                ) : (
                  <p className="text-sm text-[#8aa097]">No file selected</p>
                )}
              </div>
              <button
                className="ml-3 inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#ecf8f1] px-3 py-2 text-xs font-bold text-[#13804e] transition hover:bg-[#dff3e8]"
                onClick={() => licenseInputRef.current?.click()}
                type="button"
              >
                <Upload className="h-3.5 w-3.5" />
                {licenseFile || existingDocumentNames.license ? 'Replace' : 'Upload'}
              </button>
            </div>
            {existingDocumentNames.license && !licenseFile ? (
              <p className="text-xs font-semibold text-[#607d74]">Current: {existingDocumentNames.license}</p>
            ) : null}
          </Field>
          <Field label="ID Proof" required>
            <input
              ref={idProofInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(event) => setIdProofFile(event.target.files?.[0] ?? null)}
              required={!editId || !existingDocumentNames.idProof}
              type="file"
            />
            <div className="flex min-h-[46px] items-center justify-between rounded-lg border border-[#dce4e0] bg-white px-3 py-2">
              <div className="min-w-0 flex-1">
                {idProofFile ? (
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#142e26]">{idProofFile.name}</p>
                    <button
                      className="rounded-full p-1 text-[#607d74] transition hover:bg-[#eef3f0] hover:text-[#142e26]"
                      onClick={() => clearSelectedFile('idProof')}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : existingDocumentNames.idProof ? (
                  <p className="truncate text-sm font-medium text-[#607d74]">{existingDocumentNames.idProof}</p>
                ) : (
                  <p className="text-sm text-[#8aa097]">No file selected</p>
                )}
              </div>
              <button
                className="ml-3 inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#ecf8f1] px-3 py-2 text-xs font-bold text-[#13804e] transition hover:bg-[#dff3e8]"
                onClick={() => idProofInputRef.current?.click()}
                type="button"
              >
                <Upload className="h-3.5 w-3.5" />
                {idProofFile || existingDocumentNames.idProof ? 'Replace' : 'Upload'}
              </button>
            </div>
            {existingDocumentNames.idProof && !idProofFile ? (
              <p className="text-xs font-semibold text-[#607d74]">Current: {existingDocumentNames.idProof}</p>
            ) : null}
          </Field>
        </div>
      </section>

      <div className="flex flex-col gap-2 rounded-lg border border-[#dce4e0] bg-white p-4 shadow-sm sm:flex-row sm:justify-end">
        <Link to="/suppliers" className="rounded-lg border border-[#dce4e0] bg-white px-4 py-2 text-sm font-semibold">Cancel</Link>
        <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white" disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? (editId ? 'Updating...' : 'Saving...') : (editId ? 'Save Update' : 'Save')}
        </button>
      </div>
    </form>
  );
};

export default SupplierForm;
