import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit } from 'lucide-react';
import { getDoctorRequests, deleteDoctor, type DoctorRequest } from '@/services/admin';

const Doctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorRequest[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const data = await getDoctorRequests();
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleDelete = async (doctorId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove Dr. ${name}? This action cannot be undone.`)) {
      try {
        await deleteDoctor(doctorId);
        setDoctors(doctors.filter((d) => d.userId !== doctorId));
      } catch (error) {
        alert('Failed to remove doctor. Please try again.');
        console.error('Delete error:', error);
      }
    }
  };

  const normalizedQuery = query.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return doctors
      .filter((doctor) =>
        [doctor.name, doctor.clinicName, doctor.phone].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        ),
      )
      .slice(0, 6);
  }, [doctors, normalizedQuery]);

  const filteredDoctors = useMemo(() => {
    if (!normalizedQuery) {
      return doctors;
    }

    return doctors.filter((doctor) =>
      [doctor.name, doctor.clinicName, doctor.phone].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [doctors, normalizedQuery]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">Doctor Module</h2>
        <p className="mt-2 text-sm text-slate-500">
          Search registered doctors by doctor name, clinic name, or phone number.
        </p>

        <div className="relative mt-5">
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#16A34A] focus:ring-4 focus:ring-green-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by doctor name, clinic name, or phone number"
            value={query}
          />

          {suggestions.length > 0 ? (
            <div className="absolute z-10 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
              {suggestions.map((doctor) => (
                <button
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-emerald-50"
                  key={doctor.userId}
                  onClick={() => navigate(`/admin/doctors/${doctor.userId}`)}
                  type="button"
                >
                  <span className="font-semibold text-slate-900">{doctor.name}</span>
                  <span className="ml-2 text-slate-500">{doctor.clinicName}</span>
                  <span className="ml-2 text-slate-500">{doctor.phone}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/40 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Clinic Name</th>
                <th className="px-3 py-3">Doctor Name</th>
                <th className="px-3 py-3">Phone Number</th>
                <th className="px-3 py-3">Specialization</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>
                    Loading doctors...
                  </td>
                </tr>
              ) : filteredDoctors.length > 0 ? (
                filteredDoctors.map((doctor) => (
                  <tr
                    className="group border-b border-slate-100 text-slate-700 transition hover:bg-emerald-50/40"
                    key={doctor.userId}
                  >
                    <td className="px-3 py-3" onClick={() => navigate(`/admin/doctors/${doctor.userId}`)}>{doctor.clinicName}</td>
                    <td className="px-3 py-3 font-medium" onClick={() => navigate(`/admin/doctors/${doctor.userId}`)}>{doctor.name}</td>
                    <td className="px-3 py-3" onClick={() => navigate(`/admin/doctors/${doctor.userId}`)}>{doctor.phone}</td>
                    <td className="px-3 py-3" onClick={() => navigate(`/admin/doctors/${doctor.userId}`)}>{doctor.specialization}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                        {doctor.approvalStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                          onClick={() => navigate(`/admin/doctors/${doctor.userId}`)}
                          title="Edit Profile"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(doctor.userId, doctor.name)}
                          title="Remove Doctor"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>
                    No doctors found.
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

export { Doctors };
