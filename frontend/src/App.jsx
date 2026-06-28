// src/App.jsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TopNav from './components/layout/TopNav';
import ExploreTracks from './pages/ExploreTracks';
import TrackDetails from './pages/TrackDetails';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CDCDashboard from './pages/CDCDashboard';

// A beautifully styled profile card for the Profile route
const Profile = ({ user, onLogout }) => {
  return (
    <div className="max-w-xl mx-auto py-10 px-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600"></div>
        
        <div className="text-center mb-8">
          {user.picture ? (
            <img
              src={user.picture}
              alt="Avatar"
              className="w-20 h-20 rounded-full border-4 border-blue-50 object-cover shadow-sm mx-auto mb-4"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-extrabold mx-auto mb-4 border-4 border-blue-50">
              {user.name 
                ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
                : user.roll_number?.slice(-2) || 'ST'}
            </div>
          )}
          <h2 className="text-2xl font-bold text-slate-800">{user.name || 'Student Profile'}</h2>
          <p className="text-slate-500 text-sm mt-1">Academic & Curriculum Identity</p>
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-500">Roll Number</span>
            <span className="text-sm font-bold text-slate-800">{user.roll_number}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-500">Email Address</span>
            <span className="text-sm font-medium text-slate-800">{user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-500">Department</span>
            <span className="text-sm font-bold text-slate-800">{user.branch}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-500">Admission Mode</span>
            <span className="text-sm font-bold text-slate-800">{user.admission_type}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-500">Academic Intake</span>
            <span className="text-sm font-medium text-slate-800">{user.joining_year}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm font-semibold text-slate-500">Expected Graduation</span>
            <span className="text-semibold text-slate-800">{user.graduation_year}</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
          <button
            onClick={onLogout}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition-colors text-center"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('student_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to load saved profile:", e);
      return null;
    }
  });
  const handleLoginSuccess = (profile) => {
    setUser(profile);
    localStorage.setItem('student_profile', JSON.stringify(profile));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('student_profile');
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
        <TopNav user={user} onLogout={handleLogout} />
        <main className="max-w-[1700px] mx-auto pt-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            {/* Explore page remains public */}
            <Route path="/" element={<ExploreTracks user={user} />} />
            
            {/* Login Route */}
            <Route 
              path="/login" 
              element={user ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />} 
            />

            {/* Private Routes requiring Authentication */}
            <Route 
              path="/track/:slug" 
              element={<TrackDetails user={user} />} 
            />
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/cdc-dashboard" 
              element={user ? <CDCDashboard user={user} /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/profile" 
              element={user ? <Profile user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
            />

            {/* Fallback routing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;