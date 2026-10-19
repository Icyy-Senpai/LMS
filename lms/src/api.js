import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Every /admin/* request identifies the logged-in admin (checked by backend/middleware/requireAdmin.js).
// Every /staff/* and /dean/* request identifies the logged-in teacher; whether that teacher is a Dean is
// checked against the database by backend/middleware/requireStaff.js, not against anything sent from here.
api.interceptors.request.use((config) => {
  try {
    const saved = JSON.parse(localStorage.getItem('user'));
    if (saved && saved.accountType === 'Admin' && saved._id) {
      config.headers['x-admin-id'] = saved._id;
    }
    if (saved && saved.accountType === 'Teacher' && saved.schoolId) {
      config.headers['x-teacher-id'] = saved.schoolId;
    }
  } catch (e) { /* ignore corrupted storage */ }
  return config;
});

export default api;
