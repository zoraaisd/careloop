import { Link, NavLink } from 'react-router-dom';

import { LinkButton } from '@/components/Button';

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Login', to: '/login' },
  { label: 'Signup', to: '/signup' },
];

const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" to="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2D8CFF] to-[#0F766E] text-lg font-bold text-white shadow-lg shadow-blue-500/20">
            M
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-900">
              Meditracker
            </p>
            <p className="text-xs text-slate-500">Healthcare management platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                [
                  'text-sm font-medium transition',
                  isActive ? 'text-[#2D8CFF]' : 'text-slate-600 hover:text-slate-900',
                ].join(' ')
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block">
          <LinkButton to="/signup">Get Started</LinkButton>
        </div>

        <div className="flex gap-2 md:hidden">
          <LinkButton to="/login" variant="ghost">
            Login
          </LinkButton>
        </div>
      </div>
    </header>
  );
};

export { Navbar };
