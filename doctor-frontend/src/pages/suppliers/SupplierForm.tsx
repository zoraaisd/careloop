import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supplierApi } from './supplierApi';

const indianStates = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", 
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const initialForm = {
  supplierName: '',
  companyName: '',
  supplierCode: 'SUP-001',
  category: 'Medicine',
  licenseNumber: '',
  referenceNumber: '',
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

const inputClass = 'w-full rounded-lg border border-[#dce4e0] bg-white px-3 py-2 text-sm outline-none focus:border-[#16924d]';
const editableFormKeys = Object.keys(initialForm) as Array<keyof typeof initialForm>;

const Field = ({ 
  label, 
  children, 
  required = false, 
  error = false,
  errorMessage = 'Fill this field'
}: { 
  label: string; 
  children: React.ReactNode; 
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
}) => (
  <label className="space-y-1 block">
    <div className="flex items-center justify-between">
      <span className={`text-xs font-bold ${error ? 'text-red-500' : 'text-[#607d74]'}`}>{label}{required ? ' *' : ''}</span>
      {error && <span className="text-[10px] font-bold text-red-500 italic uppercase tracking-wider">{errorMessage}</span>}
    </div>
    {children}
  </label>
);

const getFieldClass = (field: string, validationErrors: string[], base: string = inputClass) => 
  `${base} ${validationErrors.includes(field) ? 'border-red-400 bg-red-50/30 ring-1 ring-red-100' : 'border-[#dce4e0] bg-white'}`;

const SupplierForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [showStates, setShowStates] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [existingDocumentNames, setExistingDocumentNames] = useState<{ license: string | null; idProof: string | null }>({
    license: null,
    idProof: null,
  });
  const licenseInputRef = React.useRef<HTMLInputElement | null>(null);
  const idProofInputRef = React.useRef<HTMLInputElement | null>(null);

  const hasError = (field: string) => validationErrors.includes(field);

  useEffect(() => {
    if (!editId) return;
    void supplierApi.details(editId).then((data) => {
      const nextForm = editableFormKeys.reduce((accumulator, key) => {
        const value = (data.supplier as any)[key];
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

  const update = (field: keyof typeof initialForm, value: string) => {
    let finalValue = value;

    if (field === 'supplierName') {
      const val = value.replace(/[0-9]/g, '');
      finalValue = val.startsWith(' ') ? val.trimStart() : val;
    }

    if (['phone', 'alternatePhone', 'referenceNumber'].includes(field)) {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    }

    if (field === 'pincode') {
      finalValue = value.replace(/\D/g, '').slice(0, 6);
    }

    if (field === 'email') {
      finalValue = value.replace(/[^a-zA-Z0-9@.]/g, '');
    }

    setForm((current) => ({ ...current, [field]: finalValue }));
    setValidationErrors((prev) => prev.filter((f) => f !== field));
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
    setValidationErrors((prev) => prev.filter((f) => f !== type));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: string[] = [];
    
    // Check all text fields in the form
    Object.entries(form).forEach(([key, value]) => {
      // Alternate phone is not mandatory
      if (key === 'alternatePhone') return;

      if (typeof value === 'string' && !value.trim()) {
        errors.push(key);
      }
    });

    const licenseMissing = !existingDocumentNames.license && !licenseFile;
    const idProofMissing = !existingDocumentNames.idProof && !idProofFile;

    if (licenseMissing) errors.push('license');
    if (idProofMissing) errors.push('idProof');

    if (errors.length > 0) {
      setValidationErrors(errors);
      setNotice({
        type: 'error',
        text: 'Please fill in all mandatory fields and upload necessary documents.',
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
          <Field label="Supplier Name" required error={hasError('supplierName')}><input className={getFieldClass('supplierName', validationErrors)} value={form.supplierName} onChange={(event) => update('supplierName', event.target.value)} /></Field>
          <Field label="Company Name" required error={hasError('companyName')}><input className={getFieldClass('companyName', validationErrors)} value={form.companyName} onChange={(event) => update('companyName', event.target.value)} /></Field>
          <Field label="Supplier Code">
            <input
              className={`${getFieldClass('supplierCode', validationErrors)} bg-[#f4f8f6] text-[#607d74]`}
              readOnly
              value={form.supplierCode}
              placeholder="Auto generated on save"
            />
          </Field>
          <Field label="Category" required error={hasError('category')}><select className={getFieldClass('category', validationErrors)} value={form.category} onChange={(event) => update('category', event.target.value)}><option value="All">All</option><option value="Medicine">Medicine</option><option value="Lab Supplies">Lab Supplies</option><option value="Surgical">Surgical</option><option value="Equipment">Equipment</option></select></Field>
          <Field label="License Number" required error={hasError('licenseNumber')}><input className={getFieldClass('licenseNumber', validationErrors)} value={form.licenseNumber} onChange={(event) => update('licenseNumber', event.target.value)} /></Field>
          <Field label="Number" required error={hasError('referenceNumber')}><input className={getFieldClass('referenceNumber', validationErrors)} value={form.referenceNumber} onChange={(event) => update('referenceNumber', event.target.value)} maxLength={10} placeholder="10-digit number" /></Field>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce4e0] bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-[#142e26]">Contact Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Contact Person" required error={hasError('contactPerson')}><input className={getFieldClass('contactPerson', validationErrors)} value={form.contactPerson} onChange={(event) => update('contactPerson', event.target.value)} /></Field>
          <Field label="Phone Number" required error={hasError('phone')}><input className={getFieldClass('phone', validationErrors)} value={form.phone} onChange={(event) => update('phone', event.target.value)} maxLength={10} type="tel" /></Field>
          <Field label="Email" required error={hasError('email')}><input className={getFieldClass('email', validationErrors)} value={form.email} onChange={(event) => update('email', event.target.value)} type="email" /></Field>
          <Field label="Alternate Phone" error={hasError('alternatePhone')}><input className={getFieldClass('alternatePhone', validationErrors)} value={form.alternatePhone} onChange={(event) => update('alternatePhone', event.target.value)} maxLength={10} type="tel" /></Field>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce4e0] bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-[#142e26]">Optional Additional Fields</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Address" required error={hasError('addressLine1')}><input className={getFieldClass('addressLine1', validationErrors)} value={form.addressLine1} onChange={(event) => update('addressLine1', event.target.value)} /></Field>
          <Field label="City" required error={hasError('city')}><input className={getFieldClass('city', validationErrors)} value={form.city} onChange={(event) => update('city', event.target.value)} /></Field>
          <div className="relative">
            <Field label="State" required error={hasError('state')}>
              <input
                className={getFieldClass('state', validationErrors)}
                onBlur={() => setTimeout(() => setShowStates(false), 200)}
                onChange={(event) => update('state', event.target.value)}
                onFocus={() => setShowStates(true)}
                placeholder="Search state"
                value={form.state}
              />
            </Field>
            {showStates && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#dce4e0] bg-white py-1 shadow-xl custom-scrollbar">
                {indianStates
                  .filter((s) => !form.state || s.toLowerCase().includes(form.state.toLowerCase()))
                  .map((state) => (
                    <button
                      key={state}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[#f4f8f6] hover:text-[#16924d]"
                      onClick={() => {
                        update('state', state);
                        setShowStates(false);
                      }}
                      type="button"
                    >
                      {state}
                    </button>
                  ))}
                {indianStates.filter((s) => !form.state || s.toLowerCase().includes(form.state.toLowerCase())).length === 0 && (
                  <div className="px-3 py-2 text-xs text-[#8aa097] italic">No states found</div>
                )}
              </div>
            )}
          </div>
          <Field label="Country" required error={hasError('country')}><input className={getFieldClass('country', validationErrors)} value={form.country} onChange={(event) => update('country', event.target.value)} /></Field>
          <Field label="Pincode" required error={hasError('pincode')}><input className={getFieldClass('pincode', validationErrors)} value={form.pincode} onChange={(event) => update('pincode', event.target.value)} /></Field>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce4e0] bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-[#142e26]">Documents</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="License" required error={hasError('license')} errorMessage="Upload required">
            <input
              ref={licenseInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(event) => {
                setLicenseFile(event.target.files?.[0] ?? null);
                setValidationErrors((prev) => prev.filter((f) => f !== 'license'));
              }}
              type="file"
            />
            <div className={getFieldClass('license', validationErrors, 'flex min-h-[46px] items-center justify-between rounded-lg border px-3 py-2')}>
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
          </Field>
          <Field label="ID Proof" required error={hasError('idProof')} errorMessage="Upload required">
            <input
              ref={idProofInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(event) => {
                setIdProofFile(event.target.files?.[0] ?? null);
                setValidationErrors((prev) => prev.filter((f) => f !== 'idProof'));
              }}
              type="file"
            />
            <div className={getFieldClass('idProof', validationErrors, 'flex min-h-[46px] items-center justify-between rounded-lg border px-3 py-2')}>
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
