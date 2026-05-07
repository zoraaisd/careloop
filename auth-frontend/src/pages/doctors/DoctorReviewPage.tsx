import axios from 'axios';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Navbar } from '@/components/common/Navbar';
import { getAuthSession } from '@/services/auth-storage';
import { createDoctorReview } from '@/services/public-doctors';

const IMPROVEMENT_OPTIONS = [
  'Doctor friendliness',
  'Explanation of the health issue',
  'Treatment satisfaction',
  'Value for money',
  'Wait time',
] as const;

const WAIT_OPTIONS = [
  'Less than 15 min',
  '15 min to 30 min',
  '30 min to 1 hour',
  'More than 1 hour',
] as const;

const DoctorReviewPage = () => {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const session = getAuthSession();

  const [recommendDoctor, setRecommendDoctor] = useState<boolean | null>(null);
  const [healthProblem, setHealthProblem] = useState('');
  const [waitTime, setWaitTime] = useState('');
  const [improvements, setImprovements] = useState<string[]>([]);
  const [experienceStory, setExperienceStory] = useState('');
  const [starRating, setStarRating] = useState(0);
  const [reviewerName, setReviewerName] = useState(session?.name?.trim() || '');
  const [reviewerPhone, setReviewerPhone] = useState(
    session?.phone?.trim() || window.localStorage.getItem('careloop.signup.phone')?.trim() || '',
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const doctorName = useMemo(() => {
    const stateDoctorName = (location.state as { doctorName?: string } | null)?.doctorName;
    if (stateDoctorName && stateDoctorName.trim()) {
      return stateDoctorName.trim();
    }

    return 'the doctor';
  }, [location.state]);

  const handleImprovementToggle = (value: string) => {
    setImprovements((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (recommendDoctor === null || !healthProblem.trim() || !waitTime || improvements.length === 0 || experienceStory.trim().length < 20 || starRating < 1 || !reviewerName.trim() || !reviewerPhone.trim()) {
      setErrorMessage('Please complete all required review fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createDoctorReview(id, {
        recommendDoctor,
        healthProblem: healthProblem.trim(),
        waitTime,
        improvements,
        experienceStory: experienceStory.trim(),
        reviewerName: reviewerName.trim(),
        reviewerPhone: reviewerPhone.trim(),
        starRating,
        isAnonymous: false,
      });

      setSuccessMessage('Review submitted successfully. Thank you for your feedback.');
      setTimeout(() => {
        navigate(`/doctors/${id}`);
      }, 900);
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setErrorMessage(error.response?.data?.message ?? 'Unable to submit your review right now.');
      } else {
        setErrorMessage('Unable to submit your review right now.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900" to={`/doctors/${id}`}>
            <span aria-hidden="true">&larr;</span>
            <span>Back to doctor profile</span>
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-slate-950">How was your appointment experience with {doctorName}?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Your experience will help over 1 lac people choose the right doctor, daily.</p>

          <form className="mt-7 space-y-7" onSubmit={handleSubmit}>
            <div>
              <p className="text-sm font-semibold text-slate-900">Q1. Would you like to recommend the doctor?*</p>
              <div className="mt-3 flex gap-8 text-sm text-slate-700">
                <label className="inline-flex items-center gap-2"><input checked={recommendDoctor === true} name="recommend" onChange={() => setRecommendDoctor(true)} type="radio" /> Yes</label>
                <label className="inline-flex items-center gap-2"><input checked={recommendDoctor === false} name="recommend" onChange={() => setRecommendDoctor(false)} type="radio" /> No</label>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900" htmlFor="problem">Q2. For which health problem/treatment did you visit?*</label>
              <input className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-700 outline-none ring-emerald-200 focus:ring" id="problem" onChange={(e) => setHealthProblem(e.target.value)} placeholder="e.g. Stomach Ache, body pain" type="text" value={healthProblem} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">How long did you wait to be seen by the doctor?*</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                {WAIT_OPTIONS.map((option) => (
                  <label className="inline-flex items-center gap-2" key={option}>
                    <input checked={waitTime === option} name="waitTime" onChange={() => setWaitTime(option)} type="radio" />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Q4. What do you think can be improved?*</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                {IMPROVEMENT_OPTIONS.map((option) => (
                  <label className="inline-flex items-center gap-2" key={option}>
                    <input checked={improvements.includes(option)} onChange={() => handleImprovementToggle(option)} type="checkbox" />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900" htmlFor="experience">Q5. Tell us about your experience with the doctor.*</label>
              <p className="mt-1 text-xs text-slate-500">eg. Share relevant stories which made you appreciate doctor friendliness. Read more tips</p>
              <p className="mt-2 text-xs text-slate-500">{experienceStory.trim().length}/100 Minimum</p>
              <textarea className="mt-2 min-h-[130px] w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-700 outline-none ring-emerald-200 focus:ring" id="experience" onChange={(e) => setExperienceStory(e.target.value)} placeholder="Start typing here..." value={experienceStory} />
              <p className="mt-2 text-xs leading-5 text-slate-500">Info: All patient stories go under strict moderation process before publishing to check abusive language, threats, superlative comments on medical abilities and so on. Read more</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Q6. Star rating*</p>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    className={["text-3xl transition", star <= starRating ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'].join(' ')}
                    key={star}
                    onClick={() => setStarRating(star)}
                    type="button"
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor="reviewerName">Name</label>
                <input className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700" id="reviewerName" readOnly value={reviewerName} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor="reviewerPhone">Phone</label>
                <input className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700" id="reviewerPhone" readOnly value={reviewerPhone} />
              </div>
            </div>

            {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

            <div className="flex items-center justify-end">
              <button className="inline-flex min-w-32 items-center justify-center rounded-xl bg-[#16A34A] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export { DoctorReviewPage };
