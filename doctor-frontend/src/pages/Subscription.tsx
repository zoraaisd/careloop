import React, { useEffect, useState } from 'react';
import api from '@/services/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
}

const fallbackPlans: Plan[] = [
  {
    id: '1',
    name: 'Starter',
    price: 1999,
    description: 'Perfect for small clinics',
    features: ['2 doctors included', '500 patients', '1,000 WhatsApp messages', 'Billed every month'],
  },
  {
    id: '2',
    name: 'Pro',
    price: 4999,
    description: 'Advanced features for growing clinics',
    features: ['10 doctors included', '5,000 patients', '10,000 WhatsApp messages', 'Billed every month'],
  },
  {
    id: '3',
    name: 'Enterprise',
    price: 14999,
    description: 'Full power for large hospitals',
    features: ['50 doctors included', '50,000 patients', '1,00,000 WhatsApp messages', 'Billed every month'],
  },
];

const Subscription: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/doctor/subscription/plans');
      if (response.data && response.data.length > 0) {
        setPlans(response.data);
      } else {
        setPlans(fallbackPlans);
      }
    } catch (error) {
      console.error('Failed to fetch plans', error);
      setPlans(fallbackPlans);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
        <div>
          <h2 className="text-[22px] font-bold text-gray-900">Careloop Subscription Plans</h2>
          <p className="text-gray-500 mt-1">Choose a plan for your clinic and continue through a premium checkout flow.</p>
        </div>
        <button 
          onClick={fetchPlans}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Refresh Plans
        </button>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xs font-bold tracking-wider text-green-600 uppercase mb-2">Current Plan</h3>
        <h2 className="text-2xl font-bold text-gray-900">No active subscription</h2>
        <p className="text-gray-500 mt-1">Select one of the plans below to activate billing for this clinic.</p>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-green-200 p-8 flex flex-col hover:border-green-400 transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-6">
                <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded uppercase tracking-wider">
                  Active
                </span>
                <div className="text-right">
                  <div className="flex items-baseline justify-end">
                    <span className="text-3xl font-bold text-gray-900">₹{plan.price.toLocaleString()}</span>
                  </div>
                  <span className="text-gray-500 text-sm">/ month</span>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-500 text-sm mb-8 h-10">{plan.description}</p>

              <ul className="space-y-4 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700">
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Subscription;
