// src/services/academicApi.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('student_profile') || 'null');
    const token = saved?.token || localStorage.getItem('google_auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (e) {
    const token = localStorage.getItem('google_auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

/**
 * Fetch the academic summary of the authenticated student
 */
export const getAcademicSummary = async () => {
  const headers = getAuthHeaders();
  const response = await axios.get(`${API_URL}/api/student/academic/summary`, { headers });
  return response.data;
};

/**
 * Link the student's JNTU ERP account by submitting their ERP password
 * @param {string} password - JNTU ERP Portal Password
 */
export const registerERP = async (password) => {
  const headers = getAuthHeaders();
  const response = await axios.post(
    `${API_URL}/api/student/academic/register`,
    { password },
    { headers }
  );
  return response.data;
};

/**
 * Request a background scrape refresh from JNTU ERP
 */
export const refreshERP = async () => {
  const headers = getAuthHeaders();
  const response = await axios.post(
    `${API_URL}/api/student/academic/refresh`,
    {},
    { headers }
  );
  return response.data;
};

