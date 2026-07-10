// src/pages/Login.jsx
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import axios from 'axios';
import cdcLogo from '../assets/CDC-logo.png';

// Helper to decode JWT without a library
const decodeGoogleCredential = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding Google token:', error);
    return null;
  }
};

const Login = ({ onLoginSuccess }) => {
  const [error, setError] = useState('');
  const [demoEmail, setDemoEmail] = useState('principal@gmail.com');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [activeTab, setActiveTab] = useState('full'); // 'full', 'branch', 'student'

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const ADMIN_PREFIXES = [
    'admin', 'cdc_admin', 'management',
    'principal', 'dean.careers', 'director', 'dean.academics', 'registrar', 'assistantdean.careers',
    'cse.hod', 'csm.hod', 'ece.hod', 'eee.hod', 'mech.hod',
    'hod_cse', 'hod_csm', 'hod_ece', 'hod_eee', 'hod_mech'
  ];

  const demoAccounts = {
    full: [
      { email: 'principal@gmail.com', name: 'Principal', desc: 'Full Access' },
      { email: 'dean.careers@gmail.com', name: 'Dean (Careers)', desc: 'Full Access' },
      { email: 'director@gmail.com', name: 'Director', desc: 'Full Access' },
      { email: 'dean.academics@gmail.com', name: 'Dean (Academics)', desc: 'Full Access' },
      { email: 'registrar@gmail.com', name: 'Registrar', desc: 'Full Access' },
      { email: 'assistantdean.careers@gmail.com', name: 'Asst Dean (Careers)', desc: 'Full Access' },
      { email: 'cdc_admin@hitam.org', name: 'CDC Admin', desc: 'Full Access' }
    ],
    branch: [
      { email: 'cse.hod@gmail.com', name: 'CSE HOD', desc: 'Branch Access (CSE)' },
      { email: 'csm.hod@gmail.com', name: 'CSM HOD', desc: 'Branch Access (CSM)' },
      { email: 'ece.hod@gmail.com', name: 'ECE HOD', desc: 'Branch Access (ECE)' },
      { email: 'eee.hod@gmail.com', name: 'EEE HOD', desc: 'Branch Access (EEE)' },
      { email: 'mech.hod@gmail.com', name: 'MECH HOD', desc: 'Branch Access (MECH)' }
    ],
    student: [
      { email: '24E51A0202@hitam.org', name: 'Demo Student (24E51A0202)', desc: 'Student - software-engineer-software-developer' },
      { email: '24E51A0314@hitam.org', name: 'Demo Student (24E51A0314)', desc: 'Student - software-engineer-software-developer' },
      { email: '24E51A6774@hitam.org', name: 'Demo Student (24E51A6774)', desc: 'Student - software-engineer-software-developer' },
      { email: '24121A0501@hitam.org', name: 'Demo Student (Default)', desc: 'Student' }
    ]
  };

  const handleLoginResponse = async (email, name = '', picture = '') => {
    setLoading(true);
    setError('');
    
    const emailLower = email.toLowerCase();
    const emailPrefix = emailLower.split('@')[0];
    const isAdminPrefix = ADMIN_PREFIXES.includes(emailPrefix);
    
    // Enforce @hitam.org domain for non-admin accounts
    if (!emailLower.endsWith('@hitam.org') && !isAdminPrefix) {
      setError('Access restricted. You must log in using a @hitam.org email address, or an authorized admin account.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/auth/google-login`, { 
        email,
        name,
        picture
      });
      const studentProfile = response.data;
      onLoginSuccess(studentProfile);
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.detail || 
        'Could not connect to the backend server. Make sure the FastAPI server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    const payload = decodeGoogleCredential(credentialResponse.credential);
    if (payload && payload.email) {
      handleLoginResponse(payload.email, payload.name, payload.picture);
    } else {
      setError('Failed to extract email from Google Sign-In.');
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.');
  };

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    if (!demoEmail) return;
    
    let name = 'Demo User';
    for (const key in demoAccounts) {
      const match = demoAccounts[key].find(acc => acc.email.toLowerCase() === demoEmail.trim().toLowerCase());
      if (match) {
        name = match.name;
        break;
      }
    }
    handleLoginResponse(demoEmail.trim(), name, '');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        {/* Branding & Header */}
        <div className="text-center flex flex-col items-center">
          <img 
            src={cdcLogo} 
            alt="CDC Logo" 
            className="h-20 w-auto object-contain mb-4 drop-shadow-sm" 
          />
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            CDC Explorer
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Hyderabad Institute of Technology and Management
          </p>
          <p className="mt-4 text-slate-600 text-sm">
            Log in to manage your career track selections, track semester modules, and explore your learning path.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5 animate-pulse">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Authentication Button Container */}
        <div className="mt-8 space-y-6">
          <div className="flex flex-col items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-semibold text-slate-600">Authenticating with server...</span>
              </div>
            ) : (
              <div className="w-full flex justify-center py-2">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="filled_blue"
                  shape="pill"
                  text="signin_with"
                />
              </div>
            )}
          </div>

          <div className="text-center">
            <span className="text-xs text-slate-400">
              Accepts authorized <strong className="text-slate-500">@hitam.org</strong> emails and admin accounts.
            </span>
          </div>

          {/* Divider */}
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Demo Account Access for quick testing */}
          <div className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-300">
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100/80 text-left text-sm font-bold text-slate-700 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <UserCheck size={16} className="text-blue-500" />
                Demo / Offline Developer Login
              </span>
              <ArrowRight size={16} className={`text-slate-400 transition-transform ${showDemo ? 'rotate-90' : ''}`} />
            </button>
            
            {showDemo && (
              <div className="p-4 bg-white border-t border-slate-200 space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select a role below to simulate immediate sign-in with matching access privileges:
                </p>
                
                {/* Categorized Tabs */}
                <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('full')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg flex-1 text-center transition-all cursor-pointer ${
                      activeTab === 'full' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🛡️ Full Access
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('branch')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg flex-1 text-center transition-all cursor-pointer ${
                      activeTab === 'branch' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🏛️ HODs
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('student')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg flex-1 text-center transition-all cursor-pointer ${
                      activeTab === 'student' 
                        ? 'bg-white text-slate-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🎓 Student
                  </button>
                </div>

                {/* Tab Contents: List of quick-select cards */}
                <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                  {demoAccounts[activeTab].map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => {
                        setDemoEmail(acc.email);
                        handleLoginResponse(acc.email, acc.name, '');
                      }}
                      className="group flex flex-col text-left p-2.5 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 rounded-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {acc.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black tracking-wide uppercase ${
                          activeTab === 'full' 
                            ? 'bg-red-50 text-red-600' 
                            : activeTab === 'branch' 
                              ? 'bg-indigo-50 text-indigo-600' 
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {acc.desc}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {acc.email}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">or enter custom email</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <form onSubmit={handleDemoSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Custom Email Address
                    </label>
                    <input
                      type="text"
                      required
                      className="block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      placeholder="user@hitam.org"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    Log In with Custom Account
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
