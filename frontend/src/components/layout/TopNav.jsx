// src/components/layout/TopNav.jsx
import { NavLink, Link } from 'react-router-dom';
import { Home, Compass, LayoutDashboard, User, LogOut, LogIn, Award } from 'lucide-react';

const TopNav = ({ user, onLogout }) => {
  // Helper function to dynamically apply Tailwind classes based on active state
  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
      isActive
        ? 'text-blue-600 font-bold bg-blue-50/70'
        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Brand / Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20">
              <Home size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">
              CDC Explorer
            </span>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-4">
            {/* Public Explore link */}
            <NavLink to="/" className={navLinkClass}>
              <Compass size={16} />
              <span>Explore Tracks</span>
            </NavLink>

            {user ? (
              <>
                {/* Authenticated Links */}
                <NavLink to="/dashboard" className={navLinkClass}>
                  <LayoutDashboard size={16} />
                  <span>Curriculum</span>
                </NavLink>
                <NavLink to="/cdc-dashboard" className={navLinkClass}>
                  <Award size={16} />
                  <span>CDC Performance</span>
                </NavLink>
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
                  <span className="hidden sm:inline">Logout</span>
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
          
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
