import { useState, type FormEvent } from 'react';

type Clinic = {
  id: number;
  clinicName: string;
  ownerName: string;
  address: string;
  contact: string;
  subscriptionPlan: string;
  doctors: number;
  patients: number;
  status: string;
};

type ClinicForm = {
  clinicName: string;
  ownerName: string;
  address: string;
  contact: string;
  subscriptionPlan: string;
  doctors: string;
  patients: string;
  status: string;
};

const initialClinics: Clinic[] = [
  {
    id: 1,
    clinicName: 'Green Valley Clinic',
    ownerName: 'Dr. A. Sharma',
    address: '12 MG Road, Bangalore',
    contact: '+91 99876 54211',
    subscriptionPlan: 'Enterprise',
    doctors: 24,
    patients: 4500,
    status: 'Active',
  },
  {
    id: 2,
    clinicName: 'Healthy Path Care',
    ownerName: 'Dr. M. Patel',
    address: '24 Civil Lines, Pune',
    contact: '+91 99765 43011',
    subscriptionPlan: 'Growth',
    doctors: 15,
    patients: 2600,
    status: 'Pending Approval',
  },
  {
    id: 3,
    clinicName: 'Prime Ortho Center',
    ownerName: 'Dr. N. Rao',
    address: '8 Ring Road, Hyderabad',
    contact: '+91 99543 22200',
    subscriptionPlan: 'Growth',
    doctors: 13,
    patients: 2200,
    status: 'Suspended',
  },
];

const emptyForm: ClinicForm = {
  clinicName: '',
  ownerName: '',
  address: '',
  contact: '',
  subscriptionPlan: '',
  doctors: '',
  patients: '',
  status: 'Active',
};

const actionBtnClass =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50';

const Clinics = () => {
  const [clinics, setClinics] = useState<Clinic[]>(initialClinics);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingClinicId, setEditingClinicId] = useState<number | null>(null);
  const [form, setForm] = useState<ClinicForm>(emptyForm);

  const openAddModal = () => {
    setEditingClinicId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (clinic: Clinic) => {
    setEditingClinicId(clinic.id);
    setForm({
      clinicName: clinic.clinicName,
      ownerName: clinic.ownerName,
      address: clinic.address,
      contact: clinic.contact,
      subscriptionPlan: clinic.subscriptionPlan,
      doctors: String(clinic.doctors),
      patients: String(clinic.patients),
      status: clinic.status,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingClinicId(null);
    setForm(emptyForm);
  };

  const handleDelete = (id: number) => {
    setClinics((current) => current.filter((clinic) => clinic.id !== id));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const clinicData: Clinic = {
      id: editingClinicId ?? Date.now(),
      clinicName: form.clinicName.trim(),
      ownerName: form.ownerName.trim(),
      address: form.address.trim(),
      contact: form.contact.trim(),
      subscriptionPlan: form.subscriptionPlan.trim(),
      doctors: Number(form.doctors),
      patients: Number(form.patients),
      status: form.status,
    };

    if (editingClinicId) {
      setClinics((current) =>
        current.map((clinic) => (clinic.id === editingClinicId ? clinicData : clinic)),
      );
    } else {
      setClinics((current) => [clinicData, ...current]);
    }

    closeModal();
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Clinic Management</h3>
          <p className="mt-1 text-sm text-slate-500">Add, approve, update, suspend, and monitor clinic accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            onClick={openAddModal}
            type="button"
          >
            Add New Clinic
          </button>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Total Number of Clinics: {clinics.length}
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/40 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Clinic Name</th>
                <th className="px-3 py-3">Owner Name</th>
                <th className="px-3 py-3">Address</th>
                <th className="px-3 py-3">Contact Number</th>
                <th className="px-3 py-3">Subscription Plan</th>
                <th className="px-3 py-3">Doctors</th>
                <th className="px-3 py-3">Patients</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((clinic) => (
                <tr className="border-b border-slate-100 text-slate-700" key={clinic.id}>
                  <td className="px-3 py-3 font-medium">{clinic.clinicName}</td>
                  <td className="px-3 py-3">{clinic.ownerName}</td>
                  <td className="px-3 py-3">{clinic.address}</td>
                  <td className="px-3 py-3">{clinic.contact}</td>
                  <td className="px-3 py-3">{clinic.subscriptionPlan}</td>
                  <td className="px-3 py-3">{clinic.doctors}</td>
                  <td className="px-3 py-3">{clinic.patients}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {clinic.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button className={actionBtnClass} onClick={() => openEditModal(clinic)} type="button">
                        Edit
                      </button>
                      <button className={actionBtnClass} onClick={() => handleDelete(clinic.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-900/40" onClick={closeModal} type="button" />
          <section className="relative z-10 w-full max-w-2xl rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-slate-900">
                {editingClinicId ? 'Edit Clinic Details' : 'Add New Clinic'}
              </h4>
              <button className={actionBtnClass} onClick={closeModal} type="button">
                Close
              </button>
            </div>

            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <label className="text-sm text-slate-700">
                Clinic Name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400"
                  onChange={(event) => setForm((current) => ({ ...current, clinicName: event.target.value }))}
                  required
                  type="text"
                  value={form.clinicName}
                />
              </label>

              <label className="text-sm text-slate-700">
                Owner Name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400"
                  onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))}
                  required
                  type="text"
                  value={form.ownerName}
                />
              </label>

              <label className="text-sm text-slate-700 sm:col-span-2">
                Address
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400"
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  required
                  type="text"
                  value={form.address}
                />
              </label>

              <label className="text-sm text-slate-700">
                Contact Number
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400"
                  onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))}
                  required
                  type="text"
                  value={form.contact}
                />
              </label>

              <label className="text-sm text-slate-700">
                Subscription Plan
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, subscriptionPlan: event.target.value }))
                  }
                  required
                  type="text"
                  value={form.subscriptionPlan}
                />
              </label>

              <label className="text-sm text-slate-700">
                Number of Doctors
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400"
                  min={0}
                  onChange={(event) => setForm((current) => ({ ...current, doctors: event.target.value }))}
                  required
                  type="number"
                  value={form.doctors}
                />
              </label>

              <label className="text-sm text-slate-700">
                Number of Patients
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400"
                  min={0}
                  onChange={(event) => setForm((current) => ({ ...current, patients: event.target.value }))}
                  required
                  type="number"
                  value={form.patients}
                />
              </label>

              <label className="text-sm text-slate-700 sm:col-span-2">
                Status
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400"
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  required
                  value={form.status}
                >
                  <option value="Active">Active</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </label>

              <button
                className="sm:col-span-2 mt-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                type="submit"
              >
                {editingClinicId ? 'Save Changes' : 'Add Clinic'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export { Clinics };
