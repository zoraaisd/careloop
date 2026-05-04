import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { LinkButton } from '@/components/Button';
import { clearAuthSession, getAuthSession } from '@/services/auth-storage';


const Navbar = () => {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [session, setSession] = useState(getAuthSession());

  const displayName = useMemo(() => {
    if (session?.name?.trim()) {
      return session.name.trim();
    }
    if (session?.email?.trim()) {
      return session.email.trim().split('@')[0];
    }
    return 'User';
  }, [session?.email, session?.name]);

  const displayPhone = useMemo(() => {
    const fallbackPhone = window.localStorage.getItem('careloop.signup.phone') ?? '';
    return fallbackPhone.trim();
  }, []);

  useEffect(() => {
    const onStorage = () => setSession(getAuthSession());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    setShowProfileMenu(false);
    setSession(null);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" to="/">
          <div className="flex flex-col leading-tight">
            <img
              alt="CareLoop logo"
              className="h-[50px] w-auto object-contain"
              src="/mainlogo.png"
            />
            <p className="text-xs text-gray-500 pl-[38px]">
              Healthcare management platform
            </p>
          </div>
        </Link>

        <nav className="ml-48 hidden items-center gap-6 text-sm font-semibold text-slate-700 md:flex">
          <a className="transition hover:text-emerald-700" href="#home-section">Home</a>
          <a className="transition hover:text-emerald-700" href="#about-section">About</a>
          <a className="transition hover:text-emerald-700" href="#contact-section">Contact Us</a>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {session ? (
            <div className="relative" ref={menuRef}>
              <button
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setShowProfileMenu((current) => !current)}
                type="button"
              >
                <span>{displayName}</span>
                <span className="text-xs text-slate-500">▼</span>
              </button>

              {showProfileMenu ? (
                <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded bg-slate-100 text-lg font-bold text-slate-500">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">{displayName}</p>
                      {displayPhone ? <p className="text-sm text-slate-500">+91{displayPhone}</p> : null}
                    </div>
                  </div>

                  <div className="py-2">
                    <button
                      className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/');
                      }}
                      type="button"
                    >
                      View / Update Profile
                    </button>
                    <button
                      className="block w-full px-4 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                      onClick={handleLogout}
                      type="button"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <LinkButton
              className="rounded-none border border-emerald-600 bg-white px-3 py-1.5 text-xs text-black shadow-none transition hover:bg-emerald-600 hover:text-white"
              to="/login"
            >
              Login
            </LinkButton>
          )}
        </div>


      </div>
    </header>
  );
};

export { Navbar };
