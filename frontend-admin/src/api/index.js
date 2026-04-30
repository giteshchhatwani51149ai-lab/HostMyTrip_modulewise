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
  affiliateSearch: (params) => api.get('/hotels/affiliate-search', { params }),
  affiliateGetById: (id) => api.get(`/hotels/affiliate/${id}`),
};

export const flightsAPI = {
  search: (params) => api.get('/flights/search', { params }),
  details: (id) => api.get(`/flights/details/${id}`),
};

export const searchAPI = {
  locations: (q) => api.get('/search/locations', { params: { q } }),
};

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (key, val) => api.put(`/settings/${key}`, { val }),
};

export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  bookings: (params = {}) => api.get('/admin/bookings', { params }),
  bookingDetail:     (id) => api.get(`/admin/bookings/${id}`),
  updateBooking:     (id, data) => api.patch(`/admin/bookings/${id}`, data),
  confirmBooking:    (id) => api.post(`/admin/bookings/${id}/confirm`),
  cancelBooking:     (id, reason) => api.post(`/admin/bookings/${id}/cancel`, { reason }),
  addNote:           (id, text) => api.post(`/admin/bookings/${id}/notes`, { text }),
  resendEmail:       (id) => api.post(`/admin/bookings/${id}/resend-email`),
  invoiceUrl:        (id) => `${api.defaults.baseURL}/admin/bookings/${id}/invoice`,
  pendingCollections: () => api.get('/admin/bookings/pending-collections'),
  collectPayment:    (id, data) => api.post(`/admin/bookings/${id}/collect-payment`, data),
};

export const corporatesAPI = {
  list: () => api.get('/corporates'),
  create: (data) => api.post('/corporates', data),
  update: (id, data) => api.put(`/corporates/${id}`, data),
  getMembers: (id) => api.get(`/corporates/${id}/members`),
  recordPayment: (id, data) => api.post(`/corporates/${id}/record-payment`, data),
  invoiceUrl: (id) => `${api.defaults.baseURL}/corporates/${id}/invoice`,
};

export default api;
