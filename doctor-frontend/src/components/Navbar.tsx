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
          <img
            alt="CareLoop"
            className="h-12 w-auto max-w-[210px] object-contain"
            src="/careloop-logo-full.png"
          />
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
