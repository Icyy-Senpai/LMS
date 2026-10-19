import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  try {
    const saved = JSON.parse(localStorage.getItem('user'));
    if (saved && saved.accountType === 'Admin' && saved._id) {
      config.headers['x-admin-id'] = saved._id;
    }
    if (saved && saved.accountType === 'Teacher' && saved.schoolId) {
      config.headers['x-teacher-id'] = saved.schoolId;
    }
  } catch (e) { }
  return config;
});

export default api;
