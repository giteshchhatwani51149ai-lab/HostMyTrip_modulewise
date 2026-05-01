import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Show a single, user-friendly toast on 429 (rate-limited) responses.
// Throttles repeats so a burst of failed requests doesn't spam the UI.
let _last429ToastAt = 0;
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 429) {
      const now = Date.now();
      if (now - _last429ToastAt > 4000) {
        _last429ToastAt = now;
        const msg = err.response?.data?.detail || 'Too many requests. Please slow down and try again in a moment.';
        // Defer import to avoid circular deps with toast.js
        import('../utils/toast').then(({ default: toast }) => {
          (toast.error || toast)(msg);
        }).catch(() => { /* fallback: silent */ });
      }
    }
    return Promise.reject(err);
  }
);

// ===== Auth =====
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (token) => api.get(`/auth/verify?token=${token}`),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  // Email verification (OTP)
  validateEmail: (email) => api.post('/auth/validate-email', { email }),
  sendVerificationOTP: (email) => api.post('/auth/send-verification-otp', { email }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  resendVerificationOTP: (email) => api.post('/auth/resend-verification-otp', { email }),
};

// ===== Hotels =====
export const hotelsAPI = {
  getAll: (axiosConfig = {}) => api.get('/hotels', axiosConfig),
  search: (params, axiosConfig = {}) => api.get('/hotels/search', { params, ...axiosConfig }),
  searchCached: (params) => cachedGet('/hotels/search', { params, ttl: TTL.HOTELS }),
  affiliateSearch: (params, axiosConfig = {}) => api.get('/hotels/affiliate-search', { params, ...axiosConfig }),
  affiliateGetById: (id) => api.get(`/hotels/affiliate/${id}`),
  getById: (id) => api.get(`/hotels/${id}`),
};

/* ── In-memory API cache ──────────────────────────────────────────────────
   Dedupes concurrent calls + configurable TTL.
   TTLs: bookings 60s | hotel search 30min | flight search 15min
── */
const _cache    = new Map(); // key -> { at, data }
const _inflight = new Map(); // key -> Promise

const TTL = {
  DEFAULT:  60_000,
  HOTELS:   30 * 60_000,
  FLIGHTS:  15 * 60_000,
};

function makeCacheKey(url, params) {
  return params ? `${url}?${new URLSearchParams(params).toString()}` : url;
}

const cachedGet = (url, { params, ttl = TTL.DEFAULT } = {}) => {
  const key = makeCacheKey(url, params);
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit && now - hit.at < ttl) return Promise.resolve({ data: hit.data, fromCache: true });
  if (_inflight.has(key)) return _inflight.get(key);
  const p = api.get(url, params ? { params } : undefined).then(r => {
    _cache.set(key, { at: Date.now(), data: r.data });
    _inflight.delete(key);
    return r;
  }).catch(err => { _inflight.delete(key); throw err; });
  _inflight.set(key, p);
  return p;
};

export const invalidateCache = (prefix) => {
  for (const k of _cache.keys()) if (k.startsWith(prefix)) _cache.delete(k);
};

export const invalidateBookingsCache = () => invalidateCache('/bookings/my');

// ===== Bookings =====
export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  getMy: () => cachedGet('/bookings/my'),
  getMySummary: () => cachedGet('/bookings/my?summary=1'),
  getMySingle: (id) => api.get(`/bookings/${id}`),
  cancel: (id, reason) => api.put(`/bookings/${id}/cancel`, { reason }),
  getAll: () => api.get('/bookings/all'),
  adminCreate: (data) => api.post('/bookings/admin/create', data),
  confirmPayment: (id, paypalOrderId) => api.post(`/bookings/${id}/confirm-payment`, { paypalOrderId }),
  failPayment: (id) => api.post(`/bookings/${id}/fail-payment`),
  pendingApprovals: () => api.get('/bookings/corporate/pending-approvals'),
  approveCorporate: (id, note) => api.post(`/bookings/${id}/approve`, { note }),
  rejectCorporate: (id, note) => api.post(`/bookings/${id}/reject`, { note }),
  getMemberBookings: (memberId) => api.get(`/bookings/corporate/member/${memberId}`),
  deleteMember: (memberId) => api.delete(`/bookings/corporate/member/${memberId}`),
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

export const corporatesAPI = {
  myDashboard: () => api.get('/corporates/my/dashboard'),
  myUsers: () => api.get('/corporates/my/users'),
  createMyUser: (data) => api.post('/corporates/my/users', data),
};

// ===== Search (Amadeus) =====
export const searchAPI = {
  locations: (q) => api.get('/search/locations', { params: { q } }),
};

// ===== Newsletter =====
export const newsletterAPI = {
  subscribe: (email) => api.post('/newsletter/subscribe', { email }),
};

// ===== Payments =====
export const paymentsAPI = {
  flightBooking: (data) => api.post('/payments/flight-booking', data),
  hotelBooking:  (data) => api.post('/payments/hotel-booking', data),
  createOrder:   (data) => api.post('/payments/create-order', data),
  verify:        (data) => api.post('/payments/verify', data),
  getBooking:    (id)   => api.get(`/payments/booking/${id}`),
};

// ===== Flights =====
export const flightsAPI = {
  search: (params) => api.get('/flights/search', { params }),
  searchCached: (params) => cachedGet('/flights/search', { params, ttl: TTL.FLIGHTS }),
  details: (id) => api.get(`/flights/details/${id}`),
};

// ===== Admin =====
export const adminAPI = {
  getStats:          ()           => api.get('/admin/stats'),
  getBookings:       (params)     => api.get('/admin/bookings', { params }),
  getBooking:        (id)         => api.get(`/admin/bookings/${id}`),
  updateBooking:     (id, data)   => api.patch(`/admin/bookings/${id}`, data),
  cancelBooking:     (id, reason) => api.post(`/admin/bookings/${id}/cancel`, { reason }),
  confirmBooking:    (id)         => api.post(`/admin/bookings/${id}/confirm`),
  addNote:           (id, text)   => api.post(`/admin/bookings/${id}/notes`, { text }),
  resendEmail:       (id)         => api.post(`/admin/bookings/${id}/resend-email`),
  getInvoiceUrl:     (id)         => `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/bookings/${id}/invoice`,
  getCorporates:     ()           => api.get('/corporates'),
  createCorporate:   (data)       => api.post('/corporates', data),
  updateCorporate:   (id, data)   => api.put(`/corporates/${id}`, data),
  getCorporateMembers: (id)       => api.get(`/corporates/${id}/members`),
  adminCreateBooking: (data)      => api.post('/bookings/admin/create', data),
  getAllUsers:        ()           => api.get('/bookings/all'),
  // Audit logs
  getAuditLogs:      (params)     => api.get('/admin/audit-logs', { params }),
  getAuditLog:       (id)         => api.get(`/admin/audit-logs/${id}`),
  getAuditActions:   ()           => api.get('/admin/audit-logs/actions'),
  exportAuditCSV:    (params)     => api.get('/admin/audit-logs', { params: { ...params, format: 'csv' }, responseType: 'blob' }),
};

export default api;
