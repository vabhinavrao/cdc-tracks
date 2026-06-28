// src/pages/Login.jsx
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { ShieldAlert, GraduationCap, ArrowRight, UserCheck } from 'lucide-react';
import axios from 'axios';

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
  const [demoEmail, setDemoEmail] = useState('24121A0501@hitam.org');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleLoginResponse = async (email, name = '', picture = '') => {
    setLoading(true);
    setError('');
    
    // Enforce @hitam.org domain
    if (!email.toLowerCase().endsWith('@hitam.org')) {
      setError('Access restricted. You must log in using a @hitam.org email address.');
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
    handleLoginResponse(demoEmail, 'Demo Student', '');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        {/* Branding & Header */}
        <div className="text-center">
          <div className="inline-flex bg-blue-50 p-4 rounded-2xl text-blue-600 mb-4 ring-8 ring-blue-50/50">
            <GraduationCap size={40} />
          </div>
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
              Only authorized <strong className="text-slate-500">@hitam.org</strong> domains are accepted.
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
              <form onSubmit={handleDemoSubmit} className="p-4 bg-white border-t border-slate-200 space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Type or select a demo account email below to test different roles and access controls:
                </p>
                
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Select Demo Roles:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDemoEmail('cdc_admin@hitam.org')}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-xs font-bold transition-colors cursor-pointer"
                    >
                      🛡️ CDC Admin (Full Access)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoEmail('hod_cse@hitam.org')}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-bold transition-colors cursor-pointer"
                    >
                      🏛️ HOD CSE
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoEmail('24121A0501@hitam.org')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors cursor-pointer"
                    >
                      🎓 Student
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Demo Email
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    placeholder="user@hitam.org"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Log In with Demo Account
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
