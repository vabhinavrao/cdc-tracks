// src/pages/Login.jsx
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { ShieldAlert } from 'lucide-react';
import axios from 'axios';
import cdcLogo from '../assets/CDC-logo.png';

const Login = ({ onLoginSuccess }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // The Google button returns a signed ID token (credential). We send that token
  // to the backend, which verifies it, decides the role, and returns a session
  // token + profile. The client never asserts its own identity.
  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError('Google Sign-In did not return a credential. Please try again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/google-login`, {
        credential: credentialResponse.credential,
      });
      onLoginSuccess(response.data);
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.detail ||
        'Could not sign you in. Make sure the server is running and your account is authorized.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.');
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Google Sign-In */}
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
              Accepts authorized <strong className="text-slate-500">@hitam.org</strong> student emails and approved admin accounts.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
