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

  signup: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.signup({ email, password, role: 'customer' });
      set({ isLoading: false });
      return { success: true, ...res.data };
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
