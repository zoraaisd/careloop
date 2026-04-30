import { Link, NavLink } from 'react-router-dom';

import { LinkButton } from '@/components/Button';


const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" to="/">
          <img
            alt="CareLoop logo"
            className="h-11 w-11 rounded-2xl object-cover shadow-lg shadow-green-500/20"
            src="/carelooplogo.png"
          />
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-900">
              Care Loop
            </p>
            <p className="text-xs text-slate-500">Healthcare management platform</p>
          </div>
        </Link>

        

        <div className="hidden items-center gap-2 md:flex">
          <LinkButton to="/login" variant="secondary">
            Login
          </LinkButton>
          <LinkButton to="/signup">
            Signup
          </LinkButton>
        </div>

        <div className="flex gap-2 md:hidden">
          <LinkButton to="/login" variant="secondary">
            Login
          </LinkButton>
          <LinkButton to="/signup">
            Signup
          </LinkButton>
        </div>
      </div>
    </header>
  );
};

export { Navbar };
