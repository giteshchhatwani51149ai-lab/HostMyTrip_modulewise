import { create } from 'zustand';
import { authAPI } from '../api';

export const useAdminAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('admin_user') || 'null'),
  token: localStorage.getItem('admin_token') || null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data;
      if (user.role !== 'admin' && user.role !== 'employee') {
        set({ isLoading: false, error: 'Access denied. Admin or employee credentials required.' });
        return false;
      }
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      set({ user, token, isLoading: false });
      return true;
    } catch (err) {
      set({ isLoading: false, error: err.response?.data?.message || 'Login failed' });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ user: null, token: null });
  },

  clearError: () => set({ error: null }),
}));
