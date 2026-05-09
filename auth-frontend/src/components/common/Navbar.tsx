import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { LinkButton } from '@/components/ui/Button';
import { clearAuthSession, getAuthSession } from '@/services/auth-storage';


const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
    setShowMobileMenu(false);
    setShowProfileMenu(false);
  }, [location.pathname, location.hash]);

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

  const handleSectionNavigation = (sectionId: 'home-section' | 'about-section' | 'contact-section') => {
    if (location.pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    navigate(`/#${sectionId}`);
  };

  return (
    <>
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/70 bg-[#fcfdfb]/88 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link className="flex items-center gap-3" to="/">
          <div className="flex flex-col leading-tight">
            <img
              alt="CareLoop logo"
              className="h-[44px] w-auto object-contain sm:h-[50px]"
              src="/mainlogo.png"
            />
            <p className="hidden pl-[38px] text-xs text-gray-500 lg:block">
              Healthcare management platform
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 p-1 text-sm font-semibold text-slate-700 shadow-sm md:ml-4 md:flex lg:ml-10">
          <button
            className="rounded-full px-4 py-2 transition hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => handleSectionNavigation('home-section')}
            type="button"
          >
            Home
          </button>
          <button
            className="rounded-full px-4 py-2 transition hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => handleSectionNavigation('about-section')}
            type="button"
          >
            About
          </button>
          <button
            className="rounded-full px-4 py-2 transition hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => handleSectionNavigation('contact-section')}
            type="button"
          >
            Contact Us
          </button>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <div className="relative" ref={menuRef}>
              <button
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => setShowProfileMenu((current) => !current)}
                type="button"
              >
                <span className="max-w-[130px] truncate">{displayName}</span>
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
              className="rounded-full border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold !text-slate-900 shadow-sm hover:bg-emerald-600 hover:!text-white"
              to="/login"
            >
              Login
            </LinkButton>
          )}
        </div>
        <button
          aria-label="Toggle navigation menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 md:hidden"
          onClick={() => setShowMobileMenu((current) => !current)}
          type="button"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </button>
      </div>
      {showMobileMenu ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <button
              className="rounded-md px-2 py-2 text-left transition hover:bg-slate-50 hover:text-emerald-700"
              onClick={() => handleSectionNavigation('home-section')}
              type="button"
            >
              Home
            </button>
            <button
              className="rounded-md px-2 py-2 text-left transition hover:bg-slate-50 hover:text-emerald-700"
              onClick={() => handleSectionNavigation('about-section')}
              type="button"
            >
              About
            </button>
            <button
              className="rounded-md px-2 py-2 text-left transition hover:bg-slate-50 hover:text-emerald-700"
              onClick={() => handleSectionNavigation('contact-section')}
              type="button"
            >
              Contact Us
            </button>
          </nav>
          <div className="mt-3 border-t border-slate-100 pt-3">
            {session ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                {displayPhone ? <p className="text-xs text-slate-500">+91{displayPhone}</p> : null}
                <button
                  className="block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => navigate('/')}
                  type="button"
                >
                  View / Update Profile
                </button>
                <button
                  className="block w-full rounded-md border border-rose-200 px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  onClick={handleLogout}
                  type="button"
                >
                  Logout
                </button>
              </div>
            ) : (
              <LinkButton
                className="w-full rounded-md border border-emerald-600 bg-white px-3 py-2 text-center text-sm font-semibold !text-black shadow-none hover:bg-emerald-600 hover:text-white"
                to="/login"
              >
                Login
              </LinkButton>
            )}
          </div>
        </div>
      ) : null}
    </header>
    <div aria-hidden="true" className="h-[73px] sm:h-[81px]" />
    </>
  );
};

export { Navbar };
