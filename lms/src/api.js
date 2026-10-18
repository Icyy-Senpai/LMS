import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Every /admin/* request identifies the logged-in admin (checked by backend/middleware/requireAdmin.js)
api.interceptors.request.use((config) => {
  try {
    const saved = JSON.parse(localStorage.getItem('user'));
    if (saved && saved.accountType === 'Admin' && saved._id) {
      config.headers['x-admin-id'] = saved._id;
    }
  } catch (e) { /* ignore corrupted storage */ }
  return config;
});

export default api;
