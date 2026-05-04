import { Link } from 'react-router-dom';

import { LinkButton } from '@/components/Button';


const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" to="/">
          <img
            alt="CareLoop logo"
            className="h-[42px] w-auto object-contain"
            src="/logo.png"
          />
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-900">
              Care Loop
            </p>
            <p className="text-xs text-slate-500">Healthcare management platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-700 md:flex">
          <a className="transition hover:text-emerald-700" href="#home-section">Home</a>
          <a className="transition hover:text-emerald-700" href="#about-section">About</a>
          <a className="transition hover:text-emerald-700" href="#contact-section">Contact Us</a>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LinkButton className="rounded-none px-3 py-1.5 text-xs shadow-none hover:bg-emerald-600 hover:text-white" to="/login" variant="secondary">
            Login
          </LinkButton>
        </div>

        <div className="flex gap-2 md:hidden">
          <LinkButton className="rounded-none px-3 py-1.5 text-xs shadow-none hover:bg-emerald-600 hover:text-white" to="/login" variant="secondary">
            Login
          </LinkButton>
        </div>
      </div>
    </header>
  );
};

export { Navbar };
