// src/services/academicApi.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch the academic summary of the authenticated student
 */
export const getAcademicSummary = async () => {
  const token = localStorage.getItem('google_auth_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.get(`${API_URL}/api/student/academic/summary`, { headers });
  return response.data;
};

/**
 * Link the student's JNTU ERP account by submitting their ERP password
 * @param {string} password - JNTU ERP Portal Password
 */
export const registerERP = async (password) => {
  const token = localStorage.getItem('google_auth_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
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
  const token = localStorage.getItem('google_auth_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.post(
    `${API_URL}/api/student/academic/refresh`,
    {},
    { headers }
  );
  return response.data;
};
