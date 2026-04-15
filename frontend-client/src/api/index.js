import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ===== Auth =====
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (token) => api.get(`/auth/verify?token=${token}`),
};

// ===== Hotels =====
export const hotelsAPI = {
  getAll: (axiosConfig = {}) => api.get('/hotels', axiosConfig),
  search: (params, axiosConfig = {}) => api.get('/hotels/search', { params, ...axiosConfig }),
  getById: (id) => api.get(`/hotels/${id}`),
};

// ===== Bookings =====
export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  getMy: () => api.get('/bookings/my'),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  getAll: () => api.get('/bookings/all'),
  adminCreate: (data) => api.post('/bookings/admin/create', data),
  confirmPayment: (id, paypalOrderId) => api.post(`/bookings/${id}/confirm-payment`, { paypalOrderId }),
  failPayment: (id) => api.post(`/bookings/${id}/fail-payment`),
};

// ===== Reviews =====
export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getByHotel: (hotelId) => api.get(`/reviews/hotel/${hotelId}`),
};

// ===== Bookmarks =====
export const bookmarksAPI = {
  toggle: (hotelId) => api.post('/bookmarks/toggle', { hotelId }),
  getMy: () => api.get('/bookmarks/my'),
};

export default api;
