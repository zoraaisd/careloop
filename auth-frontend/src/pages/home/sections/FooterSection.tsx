type FooterSectionProps = {
  footerEmail: string;
  onFooterEmailChange: (value: string) => void;
  onSignupClick: () => void;
};

const MailIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24">
    <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
);

const PhoneIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24">
    <path
      d="M6.6 4.8 8.8 4l2.3 5.1-1.6 1.1c1 2.1 2.6 3.8 4.6 4.8l1.2-1.6 5 2.5-.8 2.2c-.4 1-1.4 1.6-2.5 1.4C10 18.5 5.3 13.8 4.7 6.9c-.1-1 .7-1.8 1.9-2.1Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const FooterSection = ({ footerEmail, onFooterEmailChange, onSignupClick }: FooterSectionProps) => (
  <footer className="bg-slate-950 text-slate-200" id="contact-section">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.15fr_1fr_1fr_1fr] lg:px-8">
      <div className="space-y-4">
        <img
          alt="Care Loop logo"
          className="h-12 w-auto object-contain"
          src="/mainlogo.png"
        />
        <p className="max-w-xs text-sm leading-7 text-slate-400">
          Care Loop is your trusted partner in healthcare. We connect you with the best doctors and provide quality care.
        </p>
      </div>

      <div className="pt-1">
        <h4 className="text-base font-semibold text-white">Our Services</h4>
        <div className="mt-4 space-y-2.5 text-sm leading-6 text-slate-400">
          <p>WhatsApp automation</p>
          <p>Patient management</p>
          <p>Appointment tracking</p>
          <p>Health records</p>
        </div>
      </div>
      <div className="pt-1">
        <h4 className="text-base font-semibold text-white">Contact</h4>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
          <p className="flex items-center gap-3">
            <MailIcon />
            <span>info@zoraglobalai.com</span>
          </p>
          <p className="flex items-center gap-3">
            <PhoneIcon />
            <span>9087000345</span>
          </p>
          <p className="flex items-center gap-3">
            <PhoneIcon />
            <span>044-4625-4744</span>
          </p>
        </div>
      </div>
      <div className="pt-1">
        <h4 className="text-base font-semibold text-white">Sign Up for More Info</h4>
        <p className="mt-4 text-sm leading-6 text-slate-400">Get updates about Care Loop features, plans, and clinic support.</p>
        <input
          className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
          onChange={(e) => onFooterEmailChange(e.target.value)}
          placeholder="Enter your email"
          type="email"
          value={footerEmail}
        />
        <button
          className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          onClick={onSignupClick}
          type="button"
        >
          Sign Up
        </button>
      </div>
    </div>
    <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-400">
      &copy; 2026 Care Loop. All rights reserved.
    </div>
  </footer>
);

export { FooterSection };
