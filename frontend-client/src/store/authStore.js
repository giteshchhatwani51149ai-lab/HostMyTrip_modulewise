import { create } from 'zustand';
import { authAPI } from '../api';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  signup: async (payload, passwordArg) => {
    set({ isLoading: true, error: null });
    try {
      // Support both old (email, password) and new ({email, password, name}) signatures
      const data = typeof payload === 'string'
        ? { email: payload, password: passwordArg }
        : payload;
      const res = await authAPI.signup(data);
      const { token, user } = res.data;
      // Auto-login if backend returns token (new OTP-verified flow)
      if (token && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return { success: true, ...res.data };
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  loginWithToken: async (token) => {
    localStorage.setItem('token', token);
    set({ token });
    try {
      const res = await authAPI.me();
      const user = res.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
    } catch (e) { console.error('Failed to fetch user after OAuth:', e); }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
