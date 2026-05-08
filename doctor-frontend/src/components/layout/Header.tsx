import React from 'react';
import { useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  const title = pathParts.length > 0 
    ? pathParts[pathParts.length - 1].charAt(0).toUpperCase() + pathParts[pathParts.length - 1].slice(1).replace('-', ' ') 
    : 'Dashboard';

  return (
    <header className="h-[68px] border-b border-[#c6d3ce] bg-[#f8fbf9] px-6 flex items-center justify-between shrink-0">
      <h1 className="text-[24px] font-semibold text-[#142a22]">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="h-10 px-6 rounded-full bg-[#1faa62] text-white text-[15px] font-semibold inline-flex items-center">
          Active
        </span>
        <div className="h-10 w-10 rounded-full bg-[#e7f3ec] border border-[#c6d3ce] overflow-hidden flex items-center justify-center">
          <img 
            src="https://ui-avatars.com/api/?name=Dr+User&background=1d7d4f&color=fff" 
            alt="Profile" 
            className="h-full w-full object-cover" 
          />
        </div>
      </div>
    </header>
  );
};

export default Header;

