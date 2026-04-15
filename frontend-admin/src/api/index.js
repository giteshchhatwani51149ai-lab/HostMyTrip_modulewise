import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
};

export const bookingsAPI = {
  getAll: () => api.get('/bookings/all'),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  adminCreate: (data) => api.post('/bookings/admin/create', data),
};

export const hotelsAPI = {
  getAll: () => api.get('/hotels'),
  getById: (id) => api.get(`/hotels/${id}`),
};

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (key, val) => api.put(`/settings/${key}`, { val }),
};

export default api;
