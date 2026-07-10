import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Fallback to a developer placeholder if no environment variable is set
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "938362548811-dummyid.apps.googleusercontent.com";

// Attach the signed session token (issued by the backend at login) to every API
// request. This overrides any placeholder Authorization header set at the call
// site, so individual pages/components don't need to be changed.
axios.interceptors.request.use((config) => {
  try {
    const saved = JSON.parse(localStorage.getItem('student_profile') || 'null');
    if (saved && saved.token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${saved.token}`;
    }
  } catch (e) {
    /* ignore malformed profile */
  }
  return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
