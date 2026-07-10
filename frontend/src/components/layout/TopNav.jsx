// src/components/layout/TopNav.jsx
import { useState } from 'react';
import { useLocation, NavLink, Link } from 'react-router-dom';
import { Home, Compass, LayoutDashboard, User, LogOut, LogIn, Award, Menu, X, Sparkles, Briefcase } from 'lucide-react';

import cdcLogo from '../../assets/CDC-logo.png';

const TopNav = ({ user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isAdminDashboard = location.pathname === '/admin-dashboard';

  // Helper function to dynamically apply Tailwind classes based on active state
  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
      isActive
        ? 'text-blue-600 font-bold bg-blue-50/70'
        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-base font-semibold ${
      isActive
        ? 'text-blue-600 font-bold bg-blue-50/80'
        : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100/60'
    }`;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className={`${isAdminDashboard ? 'max-w-none px-6' : 'max-w-[1700px] px-4 sm:px-6 lg:px-8'} mx-auto`}>
        <div className="flex justify-between items-center h-16">
          
          {/* Brand / Logo */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group" onClick={closeMobileMenu}>
            <img 
              src={cdcLogo} 
              alt="CDC Logo" 
              className="h-8 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105" 
            />
            <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
              CDC Explorer
            </span>
          </Link>

          {/* Desktop Navigation Items */}
          <div className="hidden md:flex items-center gap-4">
            {/* Public Explore link */}
            <NavLink to="/" className={navLinkClass}>
              <Compass size={16} />
              <span>Explore Tracks</span>
            </NavLink>

            <NavLink to="/multi-stack-projects" className={navLinkClass}>
              <Sparkles size={16} className="text-amber-500" />
              <span>Multi-Stack Projects</span>
            </NavLink>

            {user ? (
              <>
                {/* Authenticated Links */}
                {user.role === 'super_admin' || user.role === 'branch_admin' || user.role === 'principal' || user.role === 'director' || user.role === 'registrar' || user.role === 'dean.academics' ? (
                  <NavLink to="/admin-dashboard" className={navLinkClass}>
                    <LayoutDashboard size={16} />
                    <span>Overview</span>
                  </NavLink>
                ) : (
                  <>
                    <NavLink to="/dashboard" className={navLinkClass}>
                      <LayoutDashboard size={16} />
                      <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/cdc-dashboard" className={navLinkClass}>
                      <Award size={16} />
                      <span>CDC Performance</span>
                    </NavLink>
                    {/* <NavLink to="/internships" className={navLinkClass}>
                      <Briefcase size={16} />
                      <span>Internships</span>
                    </NavLink> */}
                  </>
                )}
                <NavLink to="/profile" className={navLinkClass}>
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt="Avatar"
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={16} />
                  )}
                  <span>Profile</span>
                </NavLink>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              /* Anonymous Login Link */
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm shadow-blue-500/10 cursor-pointer"
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-slate-100 focus:outline-none transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          
        </div>
      </div>

      {/* Collapsible Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-2 animate-fade-in shadow-lg">
          <NavLink to="/" className={mobileNavLinkClass} onClick={closeMobileMenu}>
            <Compass size={20} />
            <span>Explore Tracks</span>
          </NavLink>

          <NavLink to="/multi-stack-projects" className={mobileNavLinkClass} onClick={closeMobileMenu}>
            <Sparkles size={20} className="text-amber-500" />
            <span>Multi-Stack Projects</span>
          </NavLink>

          {user ? (
            <>
              {user.role === 'super_admin' || user.role === 'branch_admin' || user.role === 'principal' || user.role === 'director' || user.role === 'registrar' || user.role === 'dean.academics' ? (
                <NavLink to="/admin-dashboard" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                  <LayoutDashboard size={20} />
                  <span>Admin Overview</span>
                </NavLink>
              ) : (
                <>
                  <NavLink to="/dashboard" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                  </NavLink>
                  <NavLink to="/cdc-dashboard" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    <Award size={20} />
                    <span>CDC Performance</span>
                  </NavLink>
                  {/* <NavLink to="/internships" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                    <Briefcase size={20} />
                    <span>Internships</span>
                  </NavLink> */}
                </>
              )}
              <NavLink to="/profile" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt="Avatar"
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-blue-500/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User size={20} />
                )}
                <span>Profile</span>
              </NavLink>

              <button
                onClick={() => {
                  closeMobileMenu();
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={closeMobileMenu}
              className="flex items-center justify-center gap-2 w-full mt-2 py-3 rounded-xl text-base font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
            >
              <LogIn size={18} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default TopNav;

